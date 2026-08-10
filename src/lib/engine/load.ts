import type { PrismaClient } from "@/generated/prisma/client";
import type { MatchupType } from "@/generated/prisma/enums";

/** The engine works over a whole league at once — streak detection, record
 *  lineage, and career totals all need the full picture. Leagues are small
 *  (a decade is well under 100k rows), so loading it into memory is fine and
 *  keeps every rule readable as plain array code. */

export type LoadedPlayerSlot = {
  playerId: string;
  playerName: string;
  position: string;
  slot: string;
  isStarter: boolean;
  points: number;
};

export type LoadedMatchup = {
  id: string;
  seasonId: string;
  year: number;
  week: number;
  type: MatchupType;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  isTie: boolean;
  playedOn: Date;
  margin: number;
  combined: number;
  slotsByTeam: Map<string, LoadedPlayerSlot[]>;
};

export type LoadedTeam = {
  id: string;
  seasonId: string;
  year: number;
  franchiseId: string | null;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  regularSeasonRank: number | null;
  finalRank: number | null;
  madePlayoffs: boolean;
  userId: string | null;
  managerName: string | null;
};

export type LoadedSeason = {
  id: string;
  year: number;
  isComplete: boolean;
  regularSeasonWeeks: number;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  teams: LoadedTeam[];
};

export type LoadedTransaction = {
  id: string;
  seasonId: string;
  year: number;
  week: number | null;
  type: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  faabSpent: number | null;
  occurredOn: Date;
  tradeId: string | null;
};

export type LoadedTrade = {
  id: string;
  seasonId: string;
  year: number;
  week: number | null;
  occurredOn: Date;
  items: {
    fromTeamId: string;
    toTeamId: string;
    playerId: string | null;
    playerName: string | null;
  }[];
};

export type LoadedDraftPick = {
  id: string;
  seasonId: string;
  year: number;
  teamId: string;
  playerId: string | null;
  playerName: string | null;
  round: number;
  overallPick: number;
  occurredOn: Date | null;
};

export type LeagueHistory = {
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  foundedYear: number;
  seasons: LoadedSeason[];
  matchups: LoadedMatchup[];
  transactions: LoadedTransaction[];
  trades: LoadedTrade[];
  draftPicks: LoadedDraftPick[];
  teamsById: Map<string, LoadedTeam>;
  seasonsById: Map<string, LoadedSeason>;
};

const num = (value: unknown) => Number(value ?? 0);

export async function loadLeagueHistory(
  db: PrismaClient,
  leagueId: string,
): Promise<LeagueHistory> {
  const league = await db.league.findUniqueOrThrow({
    where: { id: leagueId },
    select: { id: true, name: true, slug: true, foundedYear: true },
  });

  const seasonRows = await db.season.findMany({
    where: { leagueId },
    orderBy: { year: "asc" },
    include: {
      teams: {
        include: {
          memberships: {
            where: { isPrimary: true },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const seasons: LoadedSeason[] = seasonRows.map((season) => ({
    id: season.id,
    year: season.year,
    isComplete: season.status === "COMPLETE",
    regularSeasonWeeks: season.regularSeasonWeeks,
    championTeamId: season.championTeamId,
    runnerUpTeamId: season.runnerUpTeamId,
    teams: season.teams.map((team) => ({
      id: team.id,
      seasonId: season.id,
      year: season.year,
      franchiseId: team.franchiseId,
      name: team.name,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      pointsFor: num(team.pointsFor),
      pointsAgainst: num(team.pointsAgainst),
      regularSeasonRank: team.regularSeasonRank,
      finalRank: team.finalRank,
      madePlayoffs: team.madePlayoffs,
      userId: team.memberships[0]?.user.id ?? null,
      managerName: team.memberships[0]?.user.name ?? null,
    })),
  }));

  const seasonIds = seasons.map((s) => s.id);
  const yearBySeason = new Map(seasons.map((s) => [s.id, s.year]));

  const matchupRows = await db.matchup.findMany({
    where: { seasonId: { in: seasonIds }, isComplete: true },
    orderBy: [{ seasonId: "asc" }, { week: "asc" }],
    include: {
      players: {
        include: { player: { select: { fullName: true, position: true } } },
      },
    },
  });

  const matchups: LoadedMatchup[] = matchupRows.map((m) => {
    const homeScore = num(m.homeScore);
    const awayScore = num(m.awayScore);
    const slotsByTeam = new Map<string, LoadedPlayerSlot[]>();
    for (const slot of m.players) {
      const list = slotsByTeam.get(slot.fantasyTeamId) ?? [];
      list.push({
        playerId: slot.playerId,
        playerName: slot.player.fullName,
        position: slot.player.position,
        slot: slot.slot,
        isStarter: slot.isStarter,
        points: num(slot.points),
      });
      slotsByTeam.set(slot.fantasyTeamId, list);
    }

    return {
      id: m.id,
      seasonId: m.seasonId,
      year: yearBySeason.get(m.seasonId)!,
      week: m.week,
      type: m.type,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore,
      awayScore,
      winnerTeamId: m.winnerTeamId,
      isTie: m.isTie,
      playedOn: m.playedOn ?? new Date(),
      margin: Math.abs(homeScore - awayScore),
      combined: homeScore + awayScore,
      slotsByTeam,
    };
  });

  const [transactionRows, tradeRows, draftRows] = await Promise.all([
    db.rosterTransaction.findMany({
      where: { seasonId: { in: seasonIds } },
      orderBy: { occurredOn: "asc" },
      include: { player: { select: { fullName: true, position: true } } },
    }),
    db.trade.findMany({
      where: { seasonId: { in: seasonIds } },
      orderBy: { occurredOn: "asc" },
      include: {
        items: { include: { player: { select: { fullName: true } } } },
      },
    }),
    db.draftPick.findMany({
      where: { seasonId: { in: seasonIds } },
      orderBy: { overallPick: "asc" },
      include: { player: { select: { fullName: true } } },
    }),
  ]);

  const teamsById = new Map<string, LoadedTeam>();
  for (const season of seasons) {
    for (const team of season.teams) teamsById.set(team.id, team);
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    leagueSlug: league.slug,
    foundedYear: league.foundedYear,
    seasons,
    matchups,
    teamsById,
    seasonsById: new Map(seasons.map((s) => [s.id, s])),
    transactions: transactionRows.map((t) => ({
      id: t.id,
      seasonId: t.seasonId,
      year: yearBySeason.get(t.seasonId)!,
      week: t.week,
      type: t.type,
      teamId: t.fantasyTeamId,
      playerId: t.playerId,
      playerName: t.player.fullName,
      position: t.player.position,
      faabSpent: t.faabSpent,
      occurredOn: t.occurredOn,
      tradeId: t.tradeId,
    })),
    trades: tradeRows.map((t) => ({
      id: t.id,
      seasonId: t.seasonId,
      year: yearBySeason.get(t.seasonId)!,
      week: t.week,
      occurredOn: t.occurredOn,
      items: t.items.map((i) => ({
        fromTeamId: i.fromTeamId,
        toTeamId: i.toTeamId,
        playerId: i.playerId,
        playerName: i.player?.fullName ?? null,
      })),
    })),
    draftPicks: draftRows.map((p) => ({
      id: p.id,
      seasonId: p.seasonId,
      year: yearBySeason.get(p.seasonId)!,
      teamId: p.fantasyTeamId,
      playerId: p.playerId,
      playerName: p.player?.fullName ?? null,
      round: p.round,
      overallPick: p.overallPick,
      occurredOn: p.occurredOn,
    })),
  };
}

/** Regular-season results in chronological order for one team. Streaks and
 *  "this team's season" views both need this shape. */
export function teamGames(history: LeagueHistory, teamId: string) {
  return history.matchups
    .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week)
    .map((m) => {
      const isHome = m.homeTeamId === teamId;
      const score = isHome ? m.homeScore : m.awayScore;
      const opponentScore = isHome ? m.awayScore : m.homeScore;
      return {
        matchup: m,
        opponentId: isHome ? m.awayTeamId : m.homeTeamId,
        score,
        opponentScore,
        result: m.isTie
          ? ("T" as const)
          : m.winnerTeamId === teamId
            ? ("W" as const)
            : ("L" as const),
      };
    });
}
