import type { PrismaClient } from "@/generated/prisma/client";
import type { ProviderType, SyncMode } from "@/generated/prisma/enums";
import { decryptJson } from "@/lib/crypto";
import { getProvider } from "@/lib/providers/registry";
import {
  ProviderError,
  type NormalizedSeason,
  type ProviderCredentials,
} from "@/lib/providers/types";
import { rebuildLeagueDerivedData } from "@/lib/engine/rebuild";

export type SyncOptions = {
  leagueId: string;
  seasons?: number[];
  mode?: SyncMode;
  withBoxScores?: boolean;
  triggeredByUserId?: string;
};

export type SyncOutcome = {
  syncId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  created: number;
  updated: number;
  errors: { entity: string; message: string }[];
  seasonsImported: number[];
};

type Counter = { created: number; updated: number };

/**
 * Imports one or more seasons from the league's provider and writes them into
 * the database.
 *
 * Every write is keyed on the provider's own identifiers, so running this
 * twice produces the same result rather than duplicate history. Rows that a
 * Super Admin has corrected carry `lockedFields`, and those fields are left
 * alone — the whole point of syncing is that it never overwrites a human.
 */
export async function runSync(
  db: PrismaClient,
  options: SyncOptions,
): Promise<SyncOutcome> {
  const league = await db.league.findUniqueOrThrow({
    where: { id: options.leagueId },
    include: { providerCredential: true },
  });

  const provider = getProvider(league.provider as ProviderType);
  const errors: { entity: string; message: string }[] = [];
  const counter: Counter = { created: 0, updated: 0 };

  const sync = await db.dataSync.create({
    data: {
      leagueId: league.id,
      provider: league.provider,
      mode: options.mode ?? "INCREMENTAL",
      status: "RUNNING",
      seasonYears: options.seasons ?? [],
      triggeredByUserId: options.triggeredByUserId ?? null,
    },
  });

  const fail = async (entity: string, message: string) => {
    errors.push({ entity, message });
    await db.dataSyncError.create({
      data: { dataSyncId: sync.id, entity, message, severity: "ERROR" },
    });
  };

  if (!provider) {
    await fail("provider", `No provider implementation for ${league.provider}.`);
    await db.dataSync.update({
      where: { id: sync.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    return { syncId: sync.id, status: "FAILED", created: 0, updated: 0, errors, seasonsImported: [] };
  }

  const credential = league.providerCredential;
  if (!credential?.providerLeagueId) {
    await fail("credential", "This league is not connected to a provider yet.");
    await db.dataSync.update({
      where: { id: sync.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    return { syncId: sync.id, status: "FAILED", created: 0, updated: 0, errors, seasonsImported: [] };
  }

  let credentials: ProviderCredentials = {};
  try {
    credentials = credential.encryptedData
      ? decryptJson<ProviderCredentials>(credential.encryptedData)
      : {};
  } catch (error) {
    await fail(
      "credential",
      `Stored credentials could not be decrypted: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const ctx = { providerLeagueId: credential.providerLeagueId, credentials };
  const seasonsImported: number[] = [];

  const targetSeasons =
    options.seasons && options.seasons.length > 0
      ? options.seasons
      : await provider
          .listSeasons(ctx, new Date().getFullYear())
          .catch(() => [new Date().getFullYear()]);

  for (const year of targetSeasons) {
    try {
      const data = await provider.fetchSeason(ctx, year, {
        withBoxScores: options.withBoxScores,
      });
      await writeSeason(db, league.id, data, counter);
      seasonsImported.push(year);
    } catch (error) {
      const message =
        error instanceof ProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
      await fail(`season:${year}`, message);
    }
  }

  // Derived data is only worth rebuilding if raw data actually landed.
  let memoriesCreated = 0;
  let recordsSet = 0;
  let awardsCreated = 0;
  if (seasonsImported.length > 0) {
    try {
      const summary = await rebuildLeagueDerivedData(db, league.id);
      memoriesCreated = summary.memories;
      recordsSet = summary.currentRecords;
      awardsCreated = summary.awards;
    } catch (error) {
      await fail(
        "engine",
        `Import succeeded but the event engine failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  const status: SyncOutcome["status"] =
    seasonsImported.length === 0
      ? "FAILED"
      : errors.length > 0
        ? "PARTIAL"
        : "SUCCESS";

  await db.dataSync.update({
    where: { id: sync.id },
    data: {
      status,
      finishedAt: new Date(),
      seasonYears: seasonsImported,
      recordsCreated: counter.created,
      recordsUpdated: counter.updated,
      memoriesCreated,
      awardsCreated,
      leagueRecordsSet: recordsSet,
    },
  });

  await db.providerCredential.update({
    where: { leagueId: league.id },
    data: { lastCheckedAt: new Date() },
  });

  return {
    syncId: sync.id,
    status,
    created: counter.created,
    updated: counter.updated,
    errors,
    seasonsImported,
  };
}

/** Writes one normalized season. Split out so the transaction boundaries and
 *  the id bookkeeping stay readable. */
async function writeSeason(
  db: PrismaClient,
  leagueId: string,
  data: NormalizedSeason,
  counter: Counter,
) {
  const { league: meta } = data;

  const season = await db.season.upsert({
    where: { leagueId_year: { leagueId, year: meta.seasonYear } },
    create: {
      leagueId,
      year: meta.seasonYear,
      status: meta.isComplete ? "COMPLETE" : "IN_PROGRESS",
      currentWeek: meta.currentWeek,
      regularSeasonWeeks: meta.regularSeasonWeeks,
      playoffWeeks: meta.playoffWeeks,
    },
    update: {
      status: meta.isComplete ? "COMPLETE" : "IN_PROGRESS",
      currentWeek: meta.currentWeek,
      regularSeasonWeeks: meta.regularSeasonWeeks,
      playoffWeeks: meta.playoffWeeks,
    },
  });

  await db.leagueSettings.upsert({
    where: { leagueId },
    create: {
      leagueId,
      teamCount: meta.teamCount,
      playoffTeamCount: meta.playoffTeamCount,
      regularSeasonWeeks: meta.regularSeasonWeeks,
      playoffWeeks: meta.playoffWeeks,
      scoringType: meta.scoringType,
    },
    update: {
      teamCount: meta.teamCount,
      playoffTeamCount: meta.playoffTeamCount,
      regularSeasonWeeks: meta.regularSeasonWeeks,
      playoffWeeks: meta.playoffWeeks,
      scoringType: meta.scoringType,
    },
  });

  // ---- Franchises and teams ----------------------------------------------
  const teamIdByProvider = new Map<string, string>();

  for (const team of data.teams) {
    const franchise = await db.franchise.upsert({
      where: {
        leagueId_providerFranchiseId: {
          leagueId,
          providerFranchiseId: team.providerTeamId,
        },
      },
      create: {
        leagueId,
        providerFranchiseId: team.providerTeamId,
        name: team.name,
      },
      // The franchise name tracks the most recent team name; historical names
      // live on FantasyTeam, which is what makes "through the years" work.
      update: { name: team.name },
    });

    const existing = await db.fantasyTeam.findUnique({
      where: {
        seasonId_providerTeamId: {
          seasonId: season.id,
          providerTeamId: team.providerTeamId,
        },
      },
      select: { id: true, lockedFields: true },
    });

    const desired = {
      name: team.name,
      abbreviation: team.abbreviation,
      logoUrl: team.logoUrl,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
      regularSeasonRank: team.regularSeasonRank,
      finalRank: team.finalRank,
      madePlayoffs:
        team.regularSeasonRank !== null &&
        team.regularSeasonRank <= meta.playoffTeamCount,
    };

    if (existing) {
      const update = omitLocked(desired, existing.lockedFields);
      await db.fantasyTeam.update({ where: { id: existing.id }, data: update });
      teamIdByProvider.set(team.providerTeamId, existing.id);
      counter.updated++;
    } else {
      const created = await db.fantasyTeam.create({
        data: {
          seasonId: season.id,
          franchiseId: franchise.id,
          providerTeamId: team.providerTeamId,
          source: "PROVIDER",
          ...desired,
        },
      });
      teamIdByProvider.set(team.providerTeamId, created.id);
      counter.created++;
    }
  }

  // ---- Players ------------------------------------------------------------
  const playerIdByProvider = new Map<string, string>();
  for (const player of data.players) {
    const row = await db.player.upsert({
      where: {
        provider_providerPlayerId: {
          provider: "ESPN",
          providerPlayerId: player.providerPlayerId,
        },
      },
      create: {
        provider: "ESPN",
        providerPlayerId: player.providerPlayerId,
        fullName: player.fullName,
        position: player.position,
        nflTeam: player.nflTeam,
      },
      update: { fullName: player.fullName, nflTeam: player.nflTeam },
    });
    playerIdByProvider.set(player.providerPlayerId, row.id);
  }

  // ---- Matchups -----------------------------------------------------------
  for (const matchup of data.matchups) {
    const homeId = teamIdByProvider.get(matchup.homeProviderTeamId);
    const awayId = teamIdByProvider.get(matchup.awayProviderTeamId);
    if (!homeId || !awayId) continue;

    const winnerTeamId =
      matchup.winner === "HOME" ? homeId : matchup.winner === "AWAY" ? awayId : null;

    const existing = await db.matchup.findUnique({
      where: {
        seasonId_week_homeTeamId_awayTeamId: {
          seasonId: season.id,
          week: matchup.week,
          homeTeamId: homeId,
          awayTeamId: awayId,
        },
      },
      select: { id: true, lockedFields: true },
    });

    const desired = {
      type: matchup.type,
      homeScore: matchup.homeScore,
      awayScore: matchup.awayScore,
      winnerTeamId,
      isTie: matchup.winner === "TIE",
      isComplete: matchup.isComplete,
      playedOn: matchup.playedOn,
    };

    let matchupId: string;
    if (existing) {
      await db.matchup.update({
        where: { id: existing.id },
        data: omitLocked(desired, existing.lockedFields),
      });
      matchupId = existing.id;
      counter.updated++;
    } else {
      const created = await db.matchup.create({
        data: {
          seasonId: season.id,
          week: matchup.week,
          homeTeamId: homeId,
          awayTeamId: awayId,
          source: "PROVIDER",
          ...desired,
        },
      });
      matchupId = created.id;
      counter.created++;
    }

    const lineups = [
      { teamId: homeId, slots: matchup.homeLineup },
      { teamId: awayId, slots: matchup.awayLineup },
    ];
    for (const { teamId, slots } of lineups) {
      for (const slot of slots) {
        const playerId = playerIdByProvider.get(slot.providerPlayerId);
        if (!playerId) continue;
        await db.matchupPlayer.upsert({
          where: {
            matchupId_fantasyTeamId_playerId: {
              matchupId,
              fantasyTeamId: teamId,
              playerId,
            },
          },
          create: {
            matchupId,
            fantasyTeamId: teamId,
            playerId,
            slot: slot.slot,
            isStarter: slot.isStarter,
            points: slot.points,
            projectedPoints: slot.projectedPoints,
          },
          update: {
            slot: slot.slot,
            isStarter: slot.isStarter,
            points: slot.points,
            projectedPoints: slot.projectedPoints,
          },
        });
      }
    }
  }

  // ---- Draft --------------------------------------------------------------
  for (const pick of data.draftPicks) {
    const teamId = teamIdByProvider.get(pick.providerTeamId);
    if (!teamId) continue;
    const playerId = pick.providerPlayerId
      ? (playerIdByProvider.get(pick.providerPlayerId) ?? null)
      : null;

    await db.draftPick.upsert({
      where: {
        seasonId_overallPick: { seasonId: season.id, overallPick: pick.overallPick },
      },
      create: {
        seasonId: season.id,
        fantasyTeamId: teamId,
        playerId,
        round: pick.round,
        pickInRound: pick.pickInRound,
        overallPick: pick.overallPick,
        isKeeper: pick.isKeeper,
        auctionAmount: pick.auctionAmount,
      },
      update: { fantasyTeamId: teamId, playerId, isKeeper: pick.isKeeper },
    });
    counter.created++;
  }

  // ---- Transactions -------------------------------------------------------
  for (const txn of data.transactions) {
    const teamId = teamIdByProvider.get(txn.providerTeamId);
    const playerId = playerIdByProvider.get(txn.providerPlayerId);
    if (!teamId || !playerId) continue;

    await db.rosterTransaction.upsert({
      where: {
        seasonId_providerTxnId_playerId_type: {
          seasonId: season.id,
          providerTxnId: txn.providerTransactionId,
          playerId,
          type: txn.type,
        },
      },
      create: {
        seasonId: season.id,
        fantasyTeamId: teamId,
        playerId,
        type: txn.type,
        week: txn.week,
        occurredOn: txn.occurredOn,
        faabSpent: txn.faabSpent,
        providerTxnId: txn.providerTransactionId,
        source: "PROVIDER",
      },
      update: { fantasyTeamId: teamId, week: txn.week, faabSpent: txn.faabSpent },
    });
    counter.created++;
  }

  // ---- Season outcome -----------------------------------------------------
  const champion = data.teams.find((t) => t.finalRank === 1);
  const runnerUp = data.teams.find((t) => t.finalRank === 2);
  if (champion || runnerUp) {
    await db.season.update({
      where: { id: season.id },
      data: {
        championTeamId: champion
          ? (teamIdByProvider.get(champion.providerTeamId) ?? null)
          : null,
        runnerUpTeamId: runnerUp
          ? (teamIdByProvider.get(runnerUp.providerTeamId) ?? null)
          : null,
      },
    });
  }
}

/** Drops any field a Super Admin has pinned, so a sync cannot undo a manual
 *  correction. */
function omitLocked<T extends Record<string, unknown>>(
  values: T,
  lockedFields: string[],
): Partial<T> {
  if (lockedFields.length === 0) return values;
  const locked = new Set(lockedFields);
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !locked.has(key)),
  ) as Partial<T>;
}
