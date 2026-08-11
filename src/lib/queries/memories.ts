import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import type { MemoryType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { accessibleLeagueIds, type SessionUser } from "@/lib/session";
import { renderMemory, type RenderedMemory } from "@/lib/memories/render";

export const MEMORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "mine", label: "My team" },
  { value: "MATCHUP", label: "Matchups" },
  { value: "CHAMPIONSHIP", label: "Championships" },
  { value: "RECORD", label: "Records" },
  { value: "TRADE", label: "Trades" },
  { value: "WAIVER", label: "Waivers" },
  { value: "DRAFT", label: "Drafts" },
  { value: "PLAYER_PERFORMANCE", label: "Players" },
] as const;

export type MemoryFilter = (typeof MEMORY_FILTERS)[number]["value"];

export type MemoryCardData = {
  id: string;
  type: MemoryType;
  occurredOn: Date;
  week: number | null;
  year: number | null;
  importance: number;
  leagueName: string;
  leagueSlug: string;
  matchupId: string | null;
  rendered: RenderedMemory;
};

async function scopeFilter(user: SessionUser, leagueId?: string) {
  if (leagueId) return { leagueId };
  const ids = await accessibleLeagueIds(user);
  return ids === "ALL" ? {} : { leagueId: { in: ids } };
}

function toCard(
  memory: {
    id: string;
    type: MemoryType;
    occurredOn: Date;
    week: number | null;
    importance: number;
    template: string;
    data: unknown;
    headline: string;
    body: string | null;
    matchupId: string | null;
    season: { year: number } | null;
    league: { name: string; slug: string };
  },
  viewerId: string | null,
): MemoryCardData {
  return {
    id: memory.id,
    type: memory.type,
    occurredOn: memory.occurredOn,
    week: memory.week,
    year: memory.season?.year ?? memory.occurredOn.getUTCFullYear(),
    importance: memory.importance,
    leagueName: memory.league.name,
    leagueSlug: memory.league.slug,
    matchupId: memory.matchupId,
    rendered: renderMemory(memory, viewerId),
  };
}

const CARD_INCLUDE = {
  season: { select: { year: true } },
  league: { select: { name: true, slug: true } },
} as const;

export async function listMemories(
  user: SessionUser,
  viewerId: string,
  options: {
    filter?: MemoryFilter;
    leagueId?: string;
    take?: number;
    skip?: number;
    /** "notable" surfaces the dramatic stuff first — right for a dashboard
     *  digest. "chronological" is right for the archive, where jumbled dates
     *  would stop it reading as a chronicle. */
    order?: "notable" | "chronological";
  } = {},
) {
  const { filter = "all", leagueId, take = 30, skip = 0, order = "notable" } = options;

  const where: Prisma.MemoryWhereInput = {
    ...(await scopeFilter(user, leagueId)),
    isHidden: false,
  };

  if (filter === "mine") {
    where.subjects = { some: { userId: viewerId } };
  } else if (filter !== "all") {
    where.type = filter as MemoryType;
  }

  const memories = await db.memory.findMany({
    where,
    orderBy:
      order === "chronological"
        ? [{ occurredOn: "desc" }, { importance: "desc" }]
        : [{ importance: "desc" }, { occurredOn: "desc" }],
    take,
    skip,
    include: CARD_INCLUDE,
  });

  return memories.map((m) => toCard(m, viewerId));
}

/** Anniversaries: same month and day as today, from any earlier year. Uses raw
 *  SQL because matching on date parts is not expressible in the query builder. */
export const listOnThisDay = cache(
  async (user: SessionUser, viewerId: string, limit = 6): Promise<MemoryCardData[]> => {
    const ids = await accessibleLeagueIds(user);
    if (ids !== "ALL" && ids.length === 0) return [];

    const today = new Date();
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT m.id
      FROM "Memory" m
      WHERE m."isHidden" = false
        AND EXTRACT(MONTH FROM m."occurredOn") = ${today.getUTCMonth() + 1}
        AND EXTRACT(DAY FROM m."occurredOn") = ${today.getUTCDate()}
        AND EXTRACT(YEAR FROM m."occurredOn") < ${today.getUTCFullYear()}
        ${ids === "ALL" ? Prisma.empty : Prisma.sql`AND m."leagueId" IN (${Prisma.join(ids)})`}
      ORDER BY
        EXISTS (
          SELECT 1 FROM "MemorySubject" s
          WHERE s."memoryId" = m.id AND s."userId" = ${viewerId}
        ) DESC,
        m.importance DESC,
        m."occurredOn" DESC
      LIMIT ${limit}
    `;

    if (rows.length === 0) return [];

    const memories = await db.memory.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: CARD_INCLUDE,
    });

    const order = new Map(rows.map((r, i) => [r.id, i]));
    return memories
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((m) => toCard(m, viewerId));
  },
);

export const getMemory = cache(async (user: SessionUser, id: string, viewerId: string) => {
  const memory = await db.memory.findFirst({
    where: { id, ...(await scopeFilter(user)) },
    include: {
      ...CARD_INCLUDE,
      subjects: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          team: { select: { id: true, name: true } },
        },
      },
      matchup: { select: { id: true, week: true } },
      record: { select: { id: true, label: true, displayValue: true } },
    },
  });
  if (!memory) return null;

  return { ...memory, card: toCard(memory, viewerId) };
});

export async function countMemories(user: SessionUser, leagueId?: string) {
  return db.memory.count({
    where: { ...(await scopeFilter(user, leagueId)), isHidden: false },
  });
}
