import { cache } from "react";
import { db } from "@/lib/db";
import { publicManagerNames } from "@/lib/privacy";

/**
 * Queries for the signed-out public league page.
 *
 * Every one of these filters on `isPublic: true` in its own `where`, rather
 * than trusting a caller to have checked first. A league holds real people's
 * names, so the gate belongs next to the data, not at the page that happens to
 * render it today.
 *
 * These deliberately return less than the members' views: no emails, no
 * memories (which are written for a specific reader), no admin fields.
 */

export const getPublicLeagueBySlug = cache(async (slug: string) => {
  return db.league.findFirst({
    where: { slug, isPublic: true },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      description: true,
      foundedYear: true,
      accentColor: true,
      logoUrl: true,
      isArchived: true,
      _count: { select: { memberships: true } },
    },
  });
});

/** Champions by season, newest first — the spine of the public page. */
export const getPublicLeagueHistory = cache(async (leagueId: string) => {
  const seasons = await db.season.findMany({
    where: { league: { isPublic: true }, leagueId },
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      status: true,
      champion: { select: { id: true, name: true } },
      runnerUp: { select: { id: true, name: true } },
      _count: { select: { teams: true } },
    },
  });
  return seasons;
});

/** Final standings for one season of a public league. */
export const getPublicSeasonStandings = cache(async (leagueId: string, seasonId: string) => {
  const season = await db.season.findFirst({
    where: { id: seasonId, leagueId, league: { isPublic: true } },
    select: { id: true, year: true, championTeamId: true },
  });
  if (!season) return null;

  const teams = await db.fantasyTeam.findMany({
    where: { seasonId: season.id },
    orderBy: [{ finalRank: "asc" }, { regularSeasonRank: "asc" }, { pointsFor: "desc" }],
    select: {
      id: true,
      name: true,
      abbreviation: true,
      logoUrl: true,
      wins: true,
      losses: true,
      ties: true,
      pointsFor: true,
      pointsAgainst: true,
      regularSeasonRank: true,
      finalRank: true,
      madePlayoffs: true,
      memberships: {
        where: { isPrimary: true },
        // Name only. A public page has no business exposing emails or ids
        // beyond what is needed to render a table.
        select: { user: { select: { name: true } } },
      },
    },
  });

  // Every manager who has ever been in this league, so the shortened form is
  // decided against the whole roster and stays stable season to season.
  const leagueRoster = await db.leagueMembership.findMany({
    where: { leagueId },
    select: { user: { select: { name: true } } },
  });
  const publicNames = publicManagerNames(
    leagueRoster.map((m) => m.user?.name ?? "").filter(Boolean),
  );

  return {
    season,
    rows: teams.map((team) => ({
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
      // First name only, disambiguated with a surname initial where two
      // managers share one. Full names stay behind the login.
      manager: (() => {
        const full = team.memberships[0]?.user?.name;
        return full ? (publicNames.get(full) ?? full.trim().split(/\s+/)[0]) : null;
      })(),
    })),
  };
});

/** Public leagues, for an index page. */
export const listPublicLeagues = cache(async () => {
  return db.league.findMany({
    where: { isPublic: true },
    orderBy: [{ isArchived: "asc" }, { foundedYear: "asc" }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      foundedYear: true,
      accentColor: true,
      isArchived: true,
      _count: { select: { memberships: true, seasons: true } },
    },
  });
});
