import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { accessibleLeagueIds, type SessionUser } from "@/lib/session";
import type { AwardCardData } from "@/components/cards/award-card";

async function scope(user: SessionUser, leagueId?: string) {
  if (leagueId) return { leagueId };
  const ids = await accessibleLeagueIds(user);
  return ids === "ALL" ? {} : { leagueId: { in: ids } };
}

const AWARD_INCLUDE = {
  definition: true,
  season: { select: { year: true } },
  user: { select: { id: true, name: true, image: true } },
  team: { select: { id: true, name: true } },
  player: { select: { id: true, fullName: true, position: true } },
  league: { select: { id: true, name: true, slug: true } },
  certificate: { select: { id: true, serialNumber: true } },
} satisfies Prisma.AwardInclude;

type AwardRow = Prisma.AwardGetPayload<{ include: typeof AWARD_INCLUDE }>;

export function toAwardCard(award: AwardRow): AwardCardData {
  return {
    id: award.id,
    icon: award.definition.icon,
    name: award.titleOverride ?? award.definition.name,
    tier: award.definition.tier,
    accentColor: award.definition.accentColor,
    description: award.description ?? award.definition.description,
    recipientName: award.user?.name ?? award.player?.fullName ?? null,
    teamName: award.team?.name ?? null,
    seasonLabel: award.season ? `${award.season.year} Season` : "All Time",
    hasCertificate: Boolean(award.certificate),
  };
}

export async function listAwards(
  user: SessionUser,
  options: {
    leagueId?: string;
    userId?: string;
    seasonId?: string;
    take?: number;
  } = {},
) {
  const awards = await db.award.findMany({
    where: {
      ...(await scope(user, options.leagueId)),
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.seasonId ? { seasonId: options.seasonId } : {}),
    },
    orderBy: [
      { isFeatured: "desc" },
      { awardedOn: "desc" },
      { definition: { sortOrder: "asc" } },
    ],
    take: options.take,
    include: AWARD_INCLUDE,
  });

  return awards.map(toAwardCard);
}

export const getAward = cache(async (user: SessionUser, id: string) => {
  const award = await db.award.findFirst({
    where: { id, ...(await scope(user)) },
    include: {
      ...AWARD_INCLUDE,
      certificate: true,
      matchup: {
        select: {
          id: true,
          week: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      },
    },
  });
  return award;
});

/** The most recent award a manager earned — the dashboard's "look what you did". */
export const getLatestAward = cache(async (user: SessionUser, userId: string) => {
  const award = await db.award.findFirst({
    where: { ...(await scope(user)), userId },
    orderBy: { awardedOn: "desc" },
    include: AWARD_INCLUDE,
  });
  return award ? { card: toAwardCard(award), raw: award } : null;
});

export const countAwardsFor = cache(async (userId: string, leagueId?: string) => {
  return db.award.count({
    where: { userId, ...(leagueId ? { leagueId } : {}) },
  });
});

export const listCertificates = cache(async (user: SessionUser, userId?: string) => {
  const certificates = await db.certificate.findMany({
    where: {
      award: {
        ...(await scope(user)),
        ...(userId ? { userId } : {}),
      },
    },
    orderBy: { issuedOn: "desc" },
    include: {
      award: {
        select: {
          id: true,
          definition: { select: { icon: true, accentColor: true, tier: true } },
          league: { select: { name: true, slug: true } },
        },
      },
    },
  });
  return certificates;
});
