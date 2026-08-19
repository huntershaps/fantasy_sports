import { db } from "@/lib/db";
import { assetIdFromRef, isUnservableProviderImage } from "@/lib/images";

export type LogoRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  /** True when the crest was set here rather than pulled from a provider. */
  isOverride: boolean;
  /** True when the provider gave a URL nothing can load without an ESPN session. */
  isUnservable: boolean;
  /** True when a sync is barred from touching this row's logo. */
  isLocked: boolean;
  canRevert: boolean;
};

export type SeasonLogos = {
  seasonId: string;
  year: number;
  teams: LogoRow[];
};

export type LeagueLogos = {
  id: string;
  name: string;
  logo: LogoRow;
  franchises: LogoRow[];
  seasons: SeasonLogos[];
  /** How many teams across every season still have no renderable crest. */
  missingCount: number;
};

function row(input: {
  id: string;
  name: string;
  logoUrl: string | null;
  providerLogoUrl?: string | null;
  lockedFields?: string[];
}): LogoRow {
  const isOverride = assetIdFromRef(input.logoUrl) !== null;
  return {
    id: input.id,
    name: input.name,
    logoUrl: input.logoUrl,
    isOverride,
    isUnservable: isUnservableProviderImage(input.logoUrl),
    isLocked: (input.lockedFields ?? []).includes("logoUrl"),
    canRevert: Boolean(input.providerLogoUrl) && input.providerLogoUrl !== input.logoUrl,
  };
}

export type LogoInventory = {
  leagues: LeagueLogos[];
  /** Managers are not scoped to a league — one person can play in several. */
  managers: LogoRow[];
  managersMissing: number;
};

/** Everything the admin logo screen edits, in one pass. */
export async function getLogoInventory(): Promise<LogoInventory> {
  const leagues = await db.league.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      franchises: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, logoUrl: true },
      },
      seasons: {
        orderBy: { year: "desc" },
        select: {
          id: true,
          year: true,
          teams: {
            orderBy: [{ regularSeasonRank: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              logoUrl: true,
              providerLogoUrl: true,
              lockedFields: true,
            },
          },
        },
      },
    },
  });

  const users = await db.user.findMany({
    where: { isDisabled: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, image: true },
  });

  const managers = users.map((user) =>
    row({ id: user.id, name: user.name, logoUrl: user.image }),
  );

  const leagueRows = leagues.map((league) => {
    const seasons = league.seasons.map((season) => ({
      seasonId: season.id,
      year: season.year,
      teams: season.teams.map(row),
    }));

    const missingCount = seasons.reduce(
      (total, season) =>
        total +
        season.teams.filter((team) => !team.logoUrl || team.isUnservable).length,
      0,
    );

    return {
      id: league.id,
      name: league.name,
      logo: row({ id: league.id, name: league.name, logoUrl: league.logoUrl }),
      franchises: league.franchises.map(row),
      seasons,
      missingCount,
    };
  });

  return {
    leagues: leagueRows,
    managers,
    managersMissing: managers.filter((m) => !m.logoUrl).length,
  };
}
