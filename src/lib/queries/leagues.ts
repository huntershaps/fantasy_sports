import { cache } from "react";
import { db } from "@/lib/db";
import { accessibleLeagueIds, type SessionUser } from "@/lib/session";

/** Every league query funnels through this so a member can never read a league
 *  they do not belong to, regardless of what the URL says. */
async function leagueScope(user: SessionUser) {
  const ids = await accessibleLeagueIds(user);
  return ids === "ALL" ? {} : { id: { in: ids } };
}

export const listLeagues = cache(async (user: SessionUser) => {
  const leagues = await db.league.findMany({
    where: { ...(await leagueScope(user)), isArchived: false },
    orderBy: { foundedYear: "asc" },
    include: {
      settings: true,
      _count: { select: { memberships: true, seasons: true } },
      seasons: {
        orderBy: { year: "desc" },
        take: 1,
        include: {
          champion: {
            select: {
              name: true,
              memberships: { include: { user: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  const withChampions = await Promise.all(
    leagues.map(async (league) => {
      const lastChampion = await db.season.findFirst({
        where: { leagueId: league.id, championTeamId: { not: null } },
        orderBy: { year: "desc" },
        include: {
          champion: {
            select: {
              name: true,
              memberships: { include: { user: { select: { name: true, id: true } } } },
            },
          },
        },
      });

      return {
        id: league.id,
        slug: league.slug,
        name: league.name,
        tagline: league.tagline,
        accentColor: league.accentColor,
        secondColor: league.secondColor,
        foundedYear: league.foundedYear,
        managerCount: league._count.memberships,
        seasonCount: league._count.seasons,
        currentSeasonYear: league.seasons[0]?.year ?? null,
        champion: lastChampion?.champion
          ? {
              year: lastChampion.year,
              teamName: lastChampion.champion.name,
              managerName: lastChampion.champion.memberships[0]?.user.name ?? null,
            }
          : null,
      };
    }),
  );

  return withChampions;
});

export const getLeagueBySlug = cache(async (user: SessionUser, slug: string) => {
  const league = await db.league.findFirst({
    where: { slug, ...(await leagueScope(user)) },
    include: {
      settings: true,
      seasons: { orderBy: { year: "desc" }, select: { id: true, year: true, status: true } },
      _count: { select: { memberships: true } },
    },
  });
  return league;
});

export const getSeasonStandings = cache(async (seasonId: string) => {
  const teams = await db.fantasyTeam.findMany({
    where: { seasonId },
    orderBy: [{ regularSeasonRank: "asc" }, { pointsFor: "desc" }],
    include: {
      memberships: {
        where: { isPrimary: true },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    logoUrl: team.logoUrl,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: Number(team.pointsFor),
    pointsAgainst: Number(team.pointsAgainst),
    rank: team.regularSeasonRank,
    finalRank: team.finalRank,
    madePlayoffs: team.madePlayoffs,
    manager: team.memberships[0]?.user ?? null,
  }));
});

export type StandingsRow = Awaited<ReturnType<typeof getSeasonStandings>>[number];

export const getSeasonMatchups = cache(async (seasonId: string, week?: number) => {
  const matchups = await db.matchup.findMany({
    where: { seasonId, ...(week ? { week } : {}) },
    orderBy: [{ week: "asc" }, { id: "asc" }],
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          memberships: { include: { user: { select: { id: true, name: true } } } },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          memberships: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return matchups.map((m) => ({
    id: m.id,
    week: m.week,
    type: m.type,
    isComplete: m.isComplete,
    isTie: m.isTie,
    playedOn: m.playedOn,
    winnerTeamId: m.winnerTeamId,
    home: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      logoUrl: m.homeTeam.logoUrl,
      score: Number(m.homeScore),
      manager: m.homeTeam.memberships[0]?.user ?? null,
    },
    away: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      logoUrl: m.awayTeam.logoUrl,
      score: Number(m.awayScore),
      manager: m.awayTeam.memberships[0]?.user ?? null,
    },
  }));
});

export type MatchupSummary = Awaited<ReturnType<typeof getSeasonMatchups>>[number];

export const getLeagueRecords = cache(async (leagueId: string) => {
  const records = await db.leagueRecord.findMany({
    where: { leagueId, isCurrent: true },
    orderBy: [{ category: "asc" }, { key: "asc" }],
    include: {
      holderUser: { select: { id: true, name: true, image: true } },
      holderTeam: { select: { id: true, name: true } },
      holderPlayer: { select: { id: true, fullName: true, position: true } },
      season: { select: { year: true } },
      previous: { select: { displayValue: true, occurredOn: true, description: true } },
    },
  });

  return records.map((r) => ({
    id: r.id,
    category: r.category,
    key: r.key,
    label: r.label,
    displayValue: r.displayValue,
    description: r.description,
    week: r.week,
    year: r.season?.year ?? null,
    matchupId: r.matchupId,
    occurredOn: r.occurredOn,
    holderUser: r.holderUser,
    holderTeam: r.holderTeam,
    holderPlayer: r.holderPlayer,
    previous: r.previous,
  }));
});

export type LeagueRecordRow = Awaited<ReturnType<typeof getLeagueRecords>>[number];
