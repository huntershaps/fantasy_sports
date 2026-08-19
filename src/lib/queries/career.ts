import { cache } from "react";
import { db } from "@/lib/db";
import { teamCrest } from "@/lib/images";

export type CareerStats = {
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  bestWeek: number;
  worstWeek: number;
  biggestWin: number;
  biggestLoss: number;
};

/** Career totals for one manager, optionally scoped to a single league.
 *  Aggregated in the database rather than by loading every matchup, since
 *  profiles are a hot path. */
export const getCareerStats = cache(
  async (userId: string, leagueId?: string): Promise<CareerStats> => {
    const teams = await db.fantasyTeam.findMany({
      where: {
        memberships: { some: { userId } },
        ...(leagueId ? { season: { leagueId } } : {}),
      },
      select: {
        id: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
        pointsAgainst: true,
        madePlayoffs: true,
        championOf: { select: { id: true } },
        runnerUpOf: { select: { id: true } },
        season: { select: { status: true } },
      },
    });

    const stats: CareerStats = {
      seasons: teams.length,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      championships: 0,
      runnerUps: 0,
      playoffAppearances: 0,
      bestWeek: 0,
      worstWeek: 0,
      biggestWin: 0,
      biggestLoss: 0,
    };

    for (const team of teams) {
      stats.wins += team.wins;
      stats.losses += team.losses;
      stats.ties += team.ties;
      stats.pointsFor += Number(team.pointsFor);
      stats.pointsAgainst += Number(team.pointsAgainst);
      if (team.madePlayoffs) stats.playoffAppearances += 1;
      if (team.championOf) stats.championships += 1;
      if (team.runnerUpOf) stats.runnerUps += 1;
    }

    stats.pointsFor = Math.round(stats.pointsFor * 100) / 100;
    stats.pointsAgainst = Math.round(stats.pointsAgainst * 100) / 100;

    const teamIds = teams.map((t) => t.id);
    if (teamIds.length > 0) {
      const games = await db.matchup.findMany({
        where: {
          isComplete: true,
          OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      });

      const owned = new Set(teamIds);
      let best = 0;
      let worst = Number.POSITIVE_INFINITY;
      let biggestWin = 0;
      let biggestLoss = 0;

      for (const game of games) {
        const isHome = owned.has(game.homeTeamId);
        const mine = Number(isHome ? game.homeScore : game.awayScore);
        const theirs = Number(isHome ? game.awayScore : game.homeScore);
        best = Math.max(best, mine);
        worst = Math.min(worst, mine);
        const margin = mine - theirs;
        if (margin > biggestWin) biggestWin = margin;
        if (-margin > biggestLoss) biggestLoss = -margin;
      }

      stats.bestWeek = best;
      stats.worstWeek = Number.isFinite(worst) ? worst : 0;
      stats.biggestWin = Math.round(biggestWin * 100) / 100;
      stats.biggestLoss = Math.round(biggestLoss * 100) / 100;
    }

    return stats;
  },
);

/** Every team a manager has ever fielded, newest first. */
export const getManagerTeams = cache(async (userId: string) => {
  const teams = await db.fantasyTeam.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { season: { year: "desc" } },
    include: {
      season: {
        select: {
          id: true,
          year: true,
          status: true,
          league: { select: { id: true, name: true, slug: true, accentColor: true } },
        },
      },
      franchise: { select: { logoUrl: true } },
      championOf: { select: { id: true } },
      runnerUpOf: { select: { id: true } },
    },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    logoUrl: teamCrest(team),
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: Number(team.pointsFor),
    rank: team.regularSeasonRank,
    finalRank: team.finalRank,
    madePlayoffs: team.madePlayoffs,
    isChampion: Boolean(team.championOf),
    isRunnerUp: Boolean(team.runnerUpOf),
    seasonId: team.season.id,
    year: team.season.year,
    isCurrent: team.season.status === "IN_PROGRESS",
    league: team.season.league,
  }));
});

export type ManagerTeam = Awaited<ReturnType<typeof getManagerTeams>>[number];

/** Current form for a team: last results, next opponent, and streak. */
export const getTeamForm = cache(async (teamId: string) => {
  const games = await db.matchup.findMany({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
    orderBy: { week: "asc" },
    include: {
      homeTeam: {
        select: { id: true, name: true, logoUrl: true, franchise: { select: { logoUrl: true } } },
      },
      awayTeam: {
        select: { id: true, name: true, logoUrl: true, franchise: { select: { logoUrl: true } } },
      },
    },
  });

  const played = games
    .filter((g) => g.isComplete)
    .map((g) => {
      const isHome = g.homeTeamId === teamId;
      return {
        id: g.id,
        week: g.week,
        score: Number(isHome ? g.homeScore : g.awayScore),
        opponentScore: Number(isHome ? g.awayScore : g.homeScore),
        opponent: isHome ? g.awayTeam : g.homeTeam,
        result: g.isTie
          ? ("T" as const)
          : g.winnerTeamId === teamId
            ? ("W" as const)
            : ("L" as const),
      };
    });

  const upcoming = games.find((g) => !g.isComplete);
  const next = upcoming
    ? {
        id: upcoming.id,
        week: upcoming.week,
        opponent: (() => {
          const other =
            upcoming.homeTeamId === teamId ? upcoming.awayTeam : upcoming.homeTeam;
          return { id: other.id, name: other.name, logoUrl: teamCrest(other) };
        })(),
      }
    : null;

  // Walk backwards while the result matches the most recent one.
  let streak = 0;
  let streakType: "W" | "L" | "T" | null = null;
  for (let i = played.length - 1; i >= 0; i--) {
    if (streakType === null) streakType = played[i].result;
    if (played[i].result !== streakType) break;
    streak++;
  }

  return { played, recent: played.slice(-5), next, streak, streakType };
});
