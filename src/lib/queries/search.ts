import { db } from "@/lib/db";
import { accessibleLeagueIds, type SessionUser } from "@/lib/session";
import { renderMemory } from "@/lib/memories/render";
import { formatPoints, formatRecord } from "@/lib/utils";

export type SearchHit = {
  id: string;
  group: "Managers" | "Teams" | "Players" | "Memories" | "Awards" | "Matchups";
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  query: string;
  total: number;
  groups: { label: SearchHit["group"]; hits: SearchHit[] }[];
};

/** Global search across every entity a viewer is allowed to see. Each group is
 *  capped so one prolific entity cannot crowd out the others. */
export async function search(
  user: SessionUser,
  viewerId: string,
  query: string,
): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { query: q, total: 0, groups: [] };

  const ids = await accessibleLeagueIds(user);
  const leagueFilter = ids === "ALL" ? {} : { leagueId: { in: ids } };
  const seasonLeagueFilter =
    ids === "ALL" ? {} : { season: { leagueId: { in: ids } } };
  const contains = { contains: q, mode: "insensitive" as const };

  const [managers, teams, players, memories, awards] = await Promise.all([
    db.user.findMany({
      where: { name: contains, isDisabled: false },
      take: 6,
      select: { id: true, name: true, _count: { select: { teamMemberships: true } } },
    }),
    db.fantasyTeam.findMany({
      where: { name: contains, ...seasonLeagueFilter },
      take: 8,
      orderBy: { season: { year: "desc" } },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        ties: true,
        season: { select: { year: true, league: { select: { name: true, slug: true } } } },
      },
    }),
    db.player.findMany({
      where: { fullName: contains },
      take: 8,
      select: { id: true, fullName: true, position: true, nflTeam: true },
    }),
    db.memory.findMany({
      where: { headline: contains, isHidden: false, ...leagueFilter },
      take: 10,
      orderBy: { importance: "desc" },
      include: {
        season: { select: { year: true } },
        league: { select: { name: true, slug: true } },
      },
    }),
    db.award.findMany({
      where: {
        ...leagueFilter,
        OR: [
          { titleOverride: contains },
          { description: contains },
          { definition: { name: contains } },
        ],
      },
      take: 8,
      include: {
        definition: { select: { name: true, icon: true } },
        season: { select: { year: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const groups: SearchResults["groups"] = [];

  if (managers.length) {
    groups.push({
      label: "Managers",
      hits: managers.map((m) => ({
        id: m.id,
        group: "Managers" as const,
        title: m.name,
        subtitle: `${m._count.teamMemberships} season${m._count.teamMemberships === 1 ? "" : "s"}`,
        href: `/profile/${m.id}`,
      })),
    });
  }

  if (teams.length) {
    groups.push({
      label: "Teams",
      hits: teams.map((t) => ({
        id: t.id,
        group: "Teams" as const,
        title: t.name,
        subtitle: `${t.season.year} · ${t.season.league.name} · ${formatRecord(t.wins, t.losses, t.ties)}`,
        href: `/league/${t.season.league.slug}?season=${t.season.year}`,
      })),
    });
  }

  if (players.length) {
    groups.push({
      label: "Players",
      hits: players.map((p) => ({
        id: p.id,
        group: "Players" as const,
        title: p.fullName,
        subtitle: [p.position, p.nflTeam].filter(Boolean).join(" · "),
        href: `/search?q=${encodeURIComponent(p.fullName)}`,
      })),
    });
  }

  if (memories.length) {
    groups.push({
      label: "Memories",
      hits: memories.map((m) => ({
        id: m.id,
        group: "Memories" as const,
        title: renderMemory(m, viewerId).text,
        subtitle: `${m.season?.year ?? m.occurredOn.getUTCFullYear()} · ${m.league.name}`,
        href: `/memories/${m.id}`,
      })),
    });
  }

  if (awards.length) {
    groups.push({
      label: "Awards",
      hits: awards.map((a) => ({
        id: a.id,
        group: "Awards" as const,
        title: `${a.definition.icon} ${a.titleOverride ?? a.definition.name}`,
        subtitle: [a.user?.name, a.season ? `${a.season.year} Season` : "All time"]
          .filter(Boolean)
          .join(" · "),
        href: `/awards/${a.id}`,
      })),
    });
  }

  return {
    query: q,
    total: groups.reduce((sum, g) => sum + g.hits.length, 0),
    groups,
  };
}

/** Everywhere a player shows up: rosters, transactions, drafts, best games. */
export async function getPlayerDossier(user: SessionUser, playerName: string) {
  const ids = await accessibleLeagueIds(user);
  const seasonScope = ids === "ALL" ? {} : { season: { leagueId: { in: ids } } };

  const player = await db.player.findFirst({
    where: { fullName: { equals: playerName, mode: "insensitive" } },
  });
  if (!player) return null;

  const [bestGames, transactions, drafts] = await Promise.all([
    db.matchupPlayer.findMany({
      where: { playerId: player.id, isStarter: true },
      orderBy: { points: "desc" },
      take: 5,
      include: {
        matchup: {
          select: {
            id: true,
            week: true,
            season: { select: { year: true, league: { select: { name: true } } } },
          },
        },
        team: { select: { name: true } },
      },
    }),
    db.rosterTransaction.findMany({
      where: { playerId: player.id, ...seasonScope },
      orderBy: { occurredOn: "desc" },
      take: 12,
      include: {
        team: {
          select: {
            name: true,
            memberships: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        season: { select: { year: true } },
      },
    }),
    db.draftPick.findMany({
      where: { playerId: player.id, ...seasonScope },
      orderBy: { season: { year: "desc" } },
      include: {
        team: { select: { name: true } },
        season: { select: { year: true } },
      },
    }),
  ]);

  return {
    player,
    bestGames: bestGames.map((g) => ({
      id: g.id,
      points: formatPoints(Number(g.points)),
      week: g.matchup.week,
      year: g.matchup.season.year,
      leagueName: g.matchup.season.league.name,
      teamName: g.team.name,
      matchupId: g.matchup.id,
    })),
    transactions,
    drafts,
  };
}
