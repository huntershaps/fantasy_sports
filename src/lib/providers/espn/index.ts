import type {
  ConnectionCheck,
  FantasyProvider,
  NormalizedDraftPick,
  NormalizedLineupSlot,
  NormalizedMatchup,
  NormalizedPlayer,
  NormalizedSeason,
  NormalizedTeam,
  NormalizedTransaction,
  ProviderContext,
} from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import type { TransactionType } from "@/generated/prisma/enums";
import { authFromCredentials, fetchLeaguePayload } from "./client";
import {
  BENCH_SLOT_IDS,
  LINEUP_SLOT_BY_ID,
  POSITION_BY_ID,
  PRO_TEAM_BY_ID,
  TRANSACTION_TYPE_BY_ESPN,
  approximateWeekDate,
  matchupTypeFor,
} from "./constants";
import type {
  EspnLeaguePayload,
  EspnMatchupSide,
  EspnRosterEntry,
  EspnTeam,
} from "./schema";

/**
 * ESPN silently ignores view names it does not recognise — it returns 200 with
 * the branch simply absent rather than erroring. `mSchedule` looks plausible
 * and is widely repeated, but it is not a real v3 view; the matchup schedule
 * comes from `mMatchup`. Verified against a real league: mSchedule yielded no
 * `schedule` key at all, mMatchup yielded 81 entries.
 */
const CORE_VIEWS = [
  "mSettings",
  "mTeam",
  "mRoster",
  "mMatchup",
  // mMatchup alone returns the bracket structure with zeroed scores;
  // mMatchupScore is what fills in totalPoints and the winner.
  "mMatchupScore",
  "mDraftDetail",
  "mStatus",
];

const num = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const round2 = (value: number) => Math.round(value * 100) / 100;

function teamName(team: EspnTeam): string {
  // ESPN moved from location+nickname to a single `name` field; older seasons
  // only have the former, so both have to be handled.
  const composed = [team.location, team.nickname].filter(Boolean).join(" ").trim();
  return team.name?.trim() || composed || `Team ${team.id ?? "?"}`;
}

/**
 * Picks the fuller of ESPN's two roster branches.
 *
 * `rosterForMatchupPeriod` carries only the players who counted — nine slots in
 * a standard lineup. `rosterForCurrentScoringPeriod` carries the whole roster
 * including the bench, which is what makes "you left 40 points on the bench"
 * possible. Prefer whichever has more entries, since which one is populated
 * varies by season and by which views were requested.
 */
function lineupFor(side: EspnMatchupSide | undefined): NormalizedLineupSlot[] {
  const full = side?.rosterForCurrentScoringPeriod?.entries ?? [];
  const starters = side?.rosterForMatchupPeriod?.entries ?? [];
  return lineupFrom(full.length >= starters.length ? full : starters);
}

function lineupFrom(entries: EspnRosterEntry[] | undefined): NormalizedLineupSlot[] {
  if (!entries) return [];
  return entries.flatMap((entry) => {
    const playerId = entry.playerId ?? entry.playerPoolEntry?.player?.id;
    if (playerId === undefined) return [];
    const slotId = num(entry.lineupSlotId, 20);
    return [
      {
        providerPlayerId: String(playerId),
        slot: LINEUP_SLOT_BY_ID[slotId] ?? "BENCH",
        isStarter: !BENCH_SLOT_IDS.has(slotId),
        points: round2(num(entry.playerPoolEntry?.appliedStatTotal)),
        projectedPoints: null,
      },
    ];
  });
}

function collectPlayers(payload: EspnLeaguePayload): NormalizedPlayer[] {
  const byId = new Map<string, NormalizedPlayer>();

  const add = (entry: EspnRosterEntry | undefined) => {
    const player = entry?.playerPoolEntry?.player;
    const id = player?.id ?? entry?.playerId;
    if (id === undefined) return;
    const key = String(id);
    if (byId.has(key)) return;
    byId.set(key, {
      providerPlayerId: key,
      fullName: player?.fullName?.trim() || `Player ${key}`,
      position: POSITION_BY_ID[num(player?.defaultPositionId, -1)] ?? "UNKNOWN",
      nflTeam: PRO_TEAM_BY_ID[num(player?.proTeamId, -1)] ?? null,
    });
  };

  for (const team of payload.teams ?? []) {
    for (const entry of team.roster?.entries ?? []) add(entry);
  }
  for (const item of payload.schedule ?? []) {
    for (const side of [item.home, item.away]) {
      for (const entry of side?.rosterForCurrentScoringPeriod?.entries ?? []) add(entry);
      for (const entry of side?.rosterForMatchupPeriod?.entries ?? []) add(entry);
    }
  }

  return [...byId.values()];
}

export const espnProvider: FantasyProvider = {
  type: "ESPN",
  label: "ESPN Fantasy",
  credentialFields: [
    {
      key: "swid",
      label: "SWID cookie",
      hint: "Include the surrounding braces, e.g. {AAAA-BBBB}. Only needed for private leagues or past seasons.",
      required: false,
    },
    {
      key: "espnS2",
      label: "espn_s2 cookie",
      hint: "The long value from the espn_s2 cookie on espn.com.",
      required: false,
    },
  ],

  async checkConnection(ctx: ProviderContext, seasonYear: number): Promise<ConnectionCheck> {
    const auth = authFromCredentials(ctx.credentials);
    const hasCredentials = Boolean(auth.swid && auth.espnS2);

    try {
      const { data } = await fetchLeaguePayload<EspnLeaguePayload>(
        ctx.providerLeagueId,
        seasonYear,
        ["mSettings", "mStatus"],
        auth,
      );
      const seasons = [
        ...new Set([...(data.status?.previousSeasons ?? []), seasonYear]),
      ].sort((a, b) => b - a);

      return {
        ok: true,
        requiresCredentials: false,
        leagueName: data.settings?.name,
        seasons,
        message: hasCredentials
          ? `Connected to “${data.settings?.name ?? "league"}”.`
          : `Connected to “${data.settings?.name ?? "league"}”. This season is public, so no cookies were needed.`,
      };
    } catch (error) {
      if (error instanceof ProviderError && error.status === 401) {
        return {
          ok: false,
          requiresCredentials: true,
          message: hasCredentials
            ? "ESPN rejected those cookies. They may have expired — sign in to espn.com again and copy fresh values."
            : "This league or season is private. Add your SWID and espn_s2 cookies to read it.",
        };
      }
      return {
        ok: false,
        requiresCredentials: false,
        message:
          error instanceof ProviderError
            ? error.message
            : "Could not reach ESPN.",
      };
    }
  },

  async listSeasons(ctx: ProviderContext, hintYear: number): Promise<number[]> {
    const auth = authFromCredentials(ctx.credentials);
    const { data } = await fetchLeaguePayload<EspnLeaguePayload>(
      ctx.providerLeagueId,
      hintYear,
      ["mStatus"],
      auth,
    );
    return [...new Set([...(data.status?.previousSeasons ?? []), hintYear])].sort(
      (a, b) => b - a,
    );
  },

  async fetchSeason(
    ctx: ProviderContext,
    seasonYear: number,
    options: { withBoxScores?: boolean } = {},
  ): Promise<NormalizedSeason> {
    const auth = authFromCredentials(ctx.credentials);
    const { data } = await fetchLeaguePayload<EspnLeaguePayload>(
      ctx.providerLeagueId,
      seasonYear,
      [...CORE_VIEWS, "mTransactions2"],
      auth,
    );

    const settings = data.settings;
    const schedule = settings?.scheduleSettings;
    const regularSeasonWeeks = num(schedule?.matchupPeriodCount, 14);
    const playoffTeamCount = num(schedule?.playoffTeamCount, 6);
    const finalPeriod = num(data.status?.finalScoringPeriod, regularSeasonWeeks + 3);
    const playoffWeeks = Math.max(1, finalPeriod - regularSeasonWeeks);

    const teams: NormalizedTeam[] = (data.teams ?? []).map((team) => {
      const overall = team.record?.overall;
      const owners = team.owners ?? (team.primaryOwner ? [team.primaryOwner] : []);
      return {
        providerTeamId: String(team.id ?? ""),
        name: teamName(team),
        abbreviation: team.abbrev?.trim() || null,
        logoUrl: team.logo?.trim() || null,
        wins: num(overall?.wins),
        losses: num(overall?.losses),
        ties: num(overall?.ties),
        pointsFor: round2(num(overall?.pointsFor)),
        pointsAgainst: round2(num(overall?.pointsAgainst)),
        // ESPN uses 0 for "no seed yet" rather than omitting the field, so it
        // has to become null or the standings render everyone as rank 0.
        regularSeasonRank: team.playoffSeed || null,
        finalRank: team.rankCalculatedFinal || null,
        ownerIds: owners.filter(Boolean),
      };
    });

    const matchups: NormalizedMatchup[] = (data.schedule ?? []).flatMap((item) => {
      const homeId = item.home?.teamId;
      const awayId = item.away?.teamId;
      // Bye weeks appear as a matchup with only one side.
      if (homeId === undefined || awayId === undefined) return [];

      const week = num(item.matchupPeriodId, 0);
      const winner = item.winner?.toUpperCase();
      const decided = winner === "HOME" || winner === "AWAY" || winner === "TIE";

      return [
        {
          week,
          type: matchupTypeFor(item.playoffTierType, week, regularSeasonWeeks, playoffWeeks),
          homeProviderTeamId: String(homeId),
          awayProviderTeamId: String(awayId),
          homeScore: round2(num(item.home?.totalPoints)),
          awayScore: round2(num(item.away?.totalPoints)),
          winner: decided ? (winner as "HOME" | "AWAY" | "TIE") : null,
          isComplete: decided,
          playedOn: approximateWeekDate(seasonYear, week),
          homeLineup: lineupFor(item.home),
          awayLineup: lineupFor(item.away),
        },
      ];
    });

    // Box scores need one request per scoring period, so they are opt-in.
    if (options.withBoxScores) {
      const playedWeeks = [
        ...new Set(matchups.filter((m) => m.isComplete).map((m) => m.week)),
      ].sort((a, b) => a - b);

      for (const week of playedWeeks) {
        try {
          const { data: weekData } = await fetchLeaguePayload<EspnLeaguePayload>(
            ctx.providerLeagueId,
            seasonYear,
            ["mBoxscore", "mMatchupScore"],
            auth,
            { scoringPeriodId: week },
          );

          for (const item of weekData.schedule ?? []) {
            if (num(item.matchupPeriodId) !== week) continue;
            const target = matchups.find(
              (m) =>
                m.week === week &&
                m.homeProviderTeamId === String(item.home?.teamId) &&
                m.awayProviderTeamId === String(item.away?.teamId),
            );
            if (!target) continue;
            target.homeLineup = lineupFor(item.home);
            target.awayLineup = lineupFor(item.away);
          }
        } catch {
          // One unavailable week must not sink the whole import; the season
          // still lands and the sync logs the gap.
        }
      }
    }

    // Before a draft happens ESPN still returns a full board of placeholder
    // picks with playerId -1. Importing those would invent draft history, so
    // only picks that actually landed on a player are kept.
    const draftHappened = data.draftDetail?.drafted === true;
    const draftPicks: NormalizedDraftPick[] = !draftHappened
      ? []
      : (data.draftDetail?.picks ?? []).flatMap((pick) => {
          if (pick.teamId === undefined) return [];
          const playerId = num(pick.playerId, -1);
          if (playerId <= 0) return [];
          return [
            {
              providerTeamId: String(pick.teamId),
              providerPlayerId: String(playerId),
              round: num(pick.roundId, 1),
              pickInRound: num(pick.roundPickNumber, 1),
              overallPick: num(pick.overallPickNumber, 0),
              isKeeper: Boolean(pick.keeper),
              auctionAmount: pick.bidAmount ? num(pick.bidAmount) : null,
            },
          ];
        });

    const transactions: NormalizedTransaction[] = (data.transactions ?? []).flatMap(
      (txn) => {
        if (txn.status && txn.status !== "EXECUTED") return [];
        const occurredOn = txn.proposedDate ? new Date(txn.proposedDate) : null;
        if (!occurredOn) return [];

        return (txn.items ?? []).flatMap((item) => {
          if (item.playerId === undefined) return [];
          const isDrop = item.type === "DROP" || (item.fromTeamId && !item.toTeamId);
          const teamId = isDrop ? item.fromTeamId : (item.toTeamId ?? txn.teamId);
          if (teamId === undefined) return [];

          const mapped = isDrop
            ? "DROP"
            : (TRANSACTION_TYPE_BY_ESPN[txn.type ?? ""] ?? "COMMISSIONER");

          return [
            {
              providerTransactionId: String(txn.id ?? `${txn.proposedDate}-${item.playerId}`),
              providerTeamId: String(teamId),
              providerPlayerId: String(item.playerId),
              type: mapped as TransactionType,
              week: txn.scoringPeriodId ?? null,
              occurredOn,
              faabSpent: txn.bidAmount ? num(txn.bidAmount) : null,
              providerTradeId: txn.type === "TRADE_ACCEPT" ? String(txn.id ?? "") : null,
            },
          ];
        });
      },
    );

    return {
      league: {
        providerLeagueId: ctx.providerLeagueId,
        name: settings?.name?.trim() || `ESPN league ${ctx.providerLeagueId}`,
        seasonYear,
        teamCount: num(settings?.size, teams.length),
        regularSeasonWeeks,
        playoffWeeks,
        playoffTeamCount,
        scoringType: settings?.scoringSettings?.scoringType ?? "STANDARD",
        currentWeek: num(data.status?.currentMatchupPeriod, 1),
        isComplete: data.status?.isActive === false,
        availableSeasons: [
          ...new Set([...(data.status?.previousSeasons ?? []), seasonYear]),
        ].sort((a, b) => b - a),
      },
      members: (data.members ?? []).flatMap((member) =>
        member.id
          ? [
              {
                providerMemberId: member.id,
                displayName: member.displayName?.trim() || "ESPN member",
                isLeagueManager: Boolean(member.isLeagueManager),
              },
            ]
          : [],
      ),
      teams,
      players: collectPlayers(data),
      matchups,
      draftPicks,
      transactions,
    };
  },
};
