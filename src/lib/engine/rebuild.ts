import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { loadLeagueHistory } from "./load";
import { computeRecords, type RecordDraft } from "./records";
import { computeAwards } from "./awards";
import { computeMemories } from "./memories";

export type RebuildSummary = {
  leagueId: string;
  leagueName: string;
  records: number;
  currentRecords: number;
  awards: number;
  certificates: number;
  memories: number;
  durationMs: number;
};

/** Recomputes every derived row for a league from its raw game data.
 *
 *  Only AUTO-sourced rows are replaced. Anything a Super Admin created or
 *  corrected by hand is MANUAL and survives untouched, which is what makes
 *  this safe to re-run after every sync. */
export async function rebuildLeagueDerivedData(
  db: PrismaClient,
  leagueId: string,
): Promise<RebuildSummary> {
  const startedAt = Date.now();
  const history = await loadLeagueHistory(db, leagueId);

  const recordDrafts = computeRecords(history);
  const awardDrafts = computeAwards(history);
  const memoryDrafts = computeMemories(history, recordDrafts);

  // ---- Records -----------------------------------------------------------
  await db.leagueRecord.deleteMany({ where: { leagueId, source: "AUTO" } });

  const recordIdByLineage = new Map<string, string>();
  const lineageKey = (key: string, sequence: number) => `${key}#${sequence}`;
  for (const draft of recordDrafts) {
    recordIdByLineage.set(lineageKey(draft.key, draft.sequence), randomUUID());
  }

  // Insert oldest-first so each row's `previous` already exists.
  const orderedRecords = [...recordDrafts].sort((a, b) => a.sequence - b.sequence);
  for (const batch of chunk(orderedRecords, 500)) {
    await db.leagueRecord.createMany({
      data: batch.map((draft) => ({
        id: recordIdByLineage.get(lineageKey(draft.key, draft.sequence))!,
        leagueId,
        category: draft.category,
        key: draft.key,
        label: draft.label,
        value: draft.value,
        displayValue: draft.displayValue,
        description: draft.description,
        seasonId: draft.seasonId ?? null,
        week: draft.week ?? null,
        matchupId: draft.matchupId ?? null,
        holderUserId: draft.holderUserId ?? null,
        holderTeamId: draft.holderTeamId ?? null,
        holderPlayerId: draft.holderPlayerId ?? null,
        occurredOn: draft.occurredOn,
        isCurrent: draft.isCurrent,
        previousRecordId:
          draft.sequence > 0
            ? (recordIdByLineage.get(lineageKey(draft.key, draft.sequence - 1)) ?? null)
            : null,
        source: "AUTO" as const,
      })),
    });
  }

  // ---- Awards ------------------------------------------------------------
  await db.award.deleteMany({ where: { leagueId, source: "AUTO" } });

  const definitions = await db.awardDefinition.findMany({
    where: { OR: [{ leagueId: null }, { leagueId }] },
    select: {
      id: true,
      key: true,
      leagueId: true,
      grantsCertificate: true,
      certificateTemplate: true,
      name: true,
    },
  });
  // A league-scoped definition overrides the global one with the same key.
  const definitionByKey = new Map<string, (typeof definitions)[number]>();
  for (const definition of definitions) {
    const existing = definitionByKey.get(definition.key);
    if (!existing || definition.leagueId) definitionByKey.set(definition.key, definition);
  }

  const awardRows = awardDrafts
    .map((draft) => {
      const definition = definitionByKey.get(draft.definitionKey);
      if (!definition) return null;
      return {
        row: {
          id: randomUUID(),
          definitionId: definition.id,
          leagueId,
          seasonId: draft.seasonId,
          week: draft.week,
          userId: draft.userId,
          fantasyTeamId: draft.fantasyTeamId,
          playerId: draft.playerId,
          matchupId: draft.matchupId,
          titleOverride: draft.titleOverride ?? null,
          description: draft.description,
          stats: draft.stats as object,
          isFeatured: draft.isFeatured,
          source: "AUTO" as const,
          dedupeKey: draft.dedupeKey,
          awardedOn: draft.awardedOn,
        },
        definition,
        draft,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  for (const batch of chunk(awardRows, 500)) {
    await db.award.createMany({ data: batch.map((entry) => entry.row) });
  }

  const certificateRows = awardRows
    .filter((entry) => entry.definition.grantsCertificate && entry.row.userId)
    .map((entry, index) => {
      const season = entry.draft.seasonId
        ? history.seasonsById.get(entry.draft.seasonId)
        : null;
      const team = entry.draft.fantasyTeamId
        ? history.teamsById.get(entry.draft.fantasyTeamId)
        : null;
      return {
        id: randomUUID(),
        awardId: entry.row.id,
        serialNumber: serial(history.leagueSlug, season?.year, index),
        template: entry.definition.certificateTemplate ?? "classic",
        recipientName: team?.managerName ?? "Unknown manager",
        title: entry.row.titleOverride ?? entry.definition.name,
        subtitle: team?.name ?? null,
        leagueName: history.leagueName,
        seasonLabel: season ? `${season.year} Season` : "All Time",
        data: entry.row.stats as object,
        issuedOn: entry.row.awardedOn,
      };
    });

  if (certificateRows.length > 0) {
    await db.certificate.createMany({ data: certificateRows });
  }

  // ---- Memories ----------------------------------------------------------
  await db.memory.deleteMany({ where: { leagueId, source: "AUTO" } });

  // Memories about a broken record point at the row that broke it.
  const currentRecordIdByKey = new Map<string, string>();
  for (const draft of recordDrafts) {
    if (draft.isCurrent) {
      currentRecordIdByKey.set(
        draft.key,
        recordIdByLineage.get(lineageKey(draft.key, draft.sequence))!,
      );
    }
  }

  const memoryRows: { id: string; draft: (typeof memoryDrafts)[number] }[] =
    memoryDrafts.map((draft) => ({ id: randomUUID(), draft }));

  for (const batch of chunk(memoryRows, 500)) {
    await db.memory.createMany({
      data: batch.map(({ id, draft }) => ({
        id,
        leagueId,
        seasonId: draft.seasonId,
        week: draft.week,
        type: draft.type,
        occurredOn: draft.occurredOn,
        template: draft.template,
        data: draft.data as object,
        headline: draft.headline,
        body: draft.body ?? null,
        importance: draft.importance,
        isFeatured: draft.importance >= 90,
        source: "AUTO" as const,
        dedupeKey: draft.dedupeKey,
        matchupId: draft.matchupId ?? null,
        tradeId: draft.tradeId ?? null,
        transactionId: draft.transactionId ?? null,
        recordId: draft.recordKey
          ? (currentRecordIdByKey.get(draft.recordKey) ?? null)
          : null,
      })),
    });
  }

  const subjectRows = memoryRows.flatMap(({ id, draft }) =>
    draft.subjects
      .filter((subject) => subject.userId || subject.fantasyTeamId)
      .map((subject) => ({
        id: randomUUID(),
        memoryId: id,
        userId: subject.userId,
        fantasyTeamId: subject.fantasyTeamId,
        role: subject.role,
      })),
  );

  for (const batch of chunk(subjectRows, 1000)) {
    await db.memorySubject.createMany({ data: batch, skipDuplicates: true });
  }

  return {
    leagueId,
    leagueName: history.leagueName,
    records: recordDrafts.length,
    currentRecords: recordDrafts.filter((r) => r.isCurrent).length,
    awards: awardRows.length,
    certificates: certificateRows.length,
    memories: memoryRows.length,
    durationMs: Date.now() - startedAt,
  };
}

export async function rebuildAllLeagues(db: PrismaClient): Promise<RebuildSummary[]> {
  const leagues = await db.league.findMany({ select: { id: true } });
  const summaries: RebuildSummary[] = [];
  for (const league of leagues) {
    summaries.push(await rebuildLeagueDerivedData(db, league.id));
  }
  return summaries;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function serial(slug: string, year: number | undefined, index: number): string {
  const prefix = slug.replace(/[^a-z0-9]/g, "").slice(0, 6).toUpperCase();
  return `${prefix}-${year ?? "ALL"}-${String(index + 1).padStart(4, "0")}`;
}

export type { RecordDraft };
