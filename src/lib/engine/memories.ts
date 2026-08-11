import type { MemoryType, SubjectRole } from "@/generated/prisma/enums";
import { formatPoints } from "@/lib/utils";
import type { LeagueHistory, LoadedTeam } from "./load";
import type { RecordDraft } from "./records";

export type MemorySubjectDraft = {
  userId: string | null;
  fantasyTeamId: string | null;
  role: SubjectRole;
};

export type MemoryDraft = {
  type: MemoryType;
  seasonId: string | null;
  week: number | null;
  occurredOn: Date;
  template: string;
  data: Record<string, unknown>;
  /** Neutral third-person wording. Used for search and for viewers who were
   *  not involved; the personalized text is rendered from template + data. */
  headline: string;
  body?: string | null;
  importance: number;
  dedupeKey: string;
  matchupId?: string | null;
  tradeId?: string | null;
  transactionId?: string | null;
  recordKey?: string | null;
  subjects: MemorySubjectDraft[];
};

const IMPORTANCE = {
  championship: 100,
  recordBroken: 90,
  playerExplosion: 78,
  blowout: 66,
  nailbiter: 64,
  trade: 56,
  bigWeek: 60,
  disasterWeek: 58,
  waiver: 40,
  drop: 26,
  draft: 30,
  matchup: 34,
} as const;

export function computeMemories(
  history: LeagueHistory,
  records: RecordDraft[],
): MemoryDraft[] {
  const drafts: MemoryDraft[] = [];
  const team = (id: string) => history.teamsById.get(id);

  // An imported team has no linked user until someone claims it, so fall back
  // to the team's own name. "The Big DIHcker won the championship" reads fine;
  // "an unknown manager won the championship" does not.
  const teamInfo = (t: LoadedTeam | undefined) => ({
    teamId: t?.id ?? null,
    teamName: t?.name ?? "Unknown team",
    userId: t?.userId ?? null,
    managerName: t?.managerName ?? t?.name ?? "Unknown team",
  });

  // ---- Every completed matchup ------------------------------------------
  // Low importance so they sit below the dramatic stuff in the feed, but they
  // exist so "this day in league history" can surface any ordinary Sunday.
  for (const m of history.matchups) {
    if (m.isTie || !m.winnerTeamId) continue;
    const winnerId = m.winnerTeamId;
    const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
    const winner = teamInfo(team(winnerId));
    const loser = teamInfo(team(loserId));
    const winnerScore = winnerId === m.homeTeamId ? m.homeScore : m.awayScore;
    const loserScore = winnerId === m.homeTeamId ? m.awayScore : m.homeScore;

    const isTitle = m.type === "CHAMPIONSHIP";
    const isBlowout = m.margin >= 55;
    const isNailbiter = m.margin <= 2;

    const template = isTitle
      ? "championship"
      : isBlowout
        ? "blowout"
        : isNailbiter
          ? "nailbiter"
          : "matchup_result";

    const importance = isTitle
      ? IMPORTANCE.championship
      : isBlowout
        ? IMPORTANCE.blowout
        : isNailbiter
          ? IMPORTANCE.nailbiter
          : IMPORTANCE.matchup;

    drafts.push({
      type: isTitle ? "CHAMPIONSHIP" : "MATCHUP",
      seasonId: m.seasonId,
      week: m.week,
      occurredOn: m.playedOn,
      template,
      data: {
        year: m.year,
        week: m.week,
        matchupType: m.type,
        winner,
        loser,
        winnerScore,
        loserScore,
        margin: Math.round(m.margin * 100) / 100,
        leagueName: history.leagueName,
      },
      headline: isTitle
        ? `${winner.teamName} won the ${m.year} championship`
        : `${winner.teamName} defeated ${loser.teamName} ${formatPoints(winnerScore)}–${formatPoints(loserScore)}`,
      importance,
      dedupeKey: `${history.leagueId}:${template}:${m.id}`,
      matchupId: m.id,
      subjects: [
        { userId: winner.userId, fantasyTeamId: winner.teamId, role: "PRIMARY" },
        { userId: loser.userId, fantasyTeamId: loser.teamId, role: "OPPONENT" },
      ],
    });
  }

  // ---- Outlier player performances --------------------------------------
  for (const m of history.matchups) {
    for (const [teamId, slots] of m.slotsByTeam) {
      const info = teamInfo(team(teamId));
      for (const slot of slots) {
        if (!slot.isStarter || slot.points < 32) continue;
        drafts.push({
          type: "PLAYER_PERFORMANCE",
          seasonId: m.seasonId,
          week: m.week,
          occurredOn: m.playedOn,
          template: "player_explosion",
          data: {
            year: m.year,
            week: m.week,
            playerName: slot.playerName,
            position: slot.position,
            points: slot.points,
            team: info,
          },
          headline: `${slot.playerName} scored ${formatPoints(slot.points)} for ${info.teamName}`,
          importance: Math.min(95, IMPORTANCE.playerExplosion + (slot.points - 32)),
          dedupeKey: `${history.leagueId}:player_explosion:${m.id}:${slot.playerId}`,
          matchupId: m.id,
          subjects: [
            { userId: info.userId, fantasyTeamId: info.teamId, role: "PRIMARY" },
          ],
        });
      }
    }
  }

  // ---- Trades ------------------------------------------------------------
  for (const trade of history.trades) {
    const sides = new Map<string, { received: string[]; sent: string[] }>();
    for (const item of trade.items) {
      const to = sides.get(item.toTeamId) ?? { received: [], sent: [] };
      const from = sides.get(item.fromTeamId) ?? { received: [], sent: [] };
      if (item.playerName) {
        to.received.push(item.playerName);
        from.sent.push(item.playerName);
      }
      sides.set(item.toTeamId, to);
      sides.set(item.fromTeamId, from);
    }

    const parties = [...sides.entries()].map(([teamId, movement]) => ({
      ...teamInfo(team(teamId)),
      ...movement,
    }));
    if (parties.length < 2) continue;

    drafts.push({
      type: "TRADE",
      seasonId: trade.seasonId,
      week: trade.week,
      occurredOn: trade.occurredOn,
      template: "trade",
      data: { year: trade.year, week: trade.week, parties },
      headline: `${parties[0].teamName} traded ${parties[0].sent.join(", ") || "picks"} to ${parties[1].teamName} for ${parties[1].sent.join(", ") || "picks"}`,
      importance: IMPORTANCE.trade,
      dedupeKey: `${history.leagueId}:trade:${trade.id}`,
      tradeId: trade.id,
      subjects: parties.map((p) => ({
        userId: p.userId,
        fantasyTeamId: p.teamId,
        role: "PARTICIPANT" as SubjectRole,
      })),
    });
  }

  // ---- Waiver adds and drops --------------------------------------------
  for (const txn of history.transactions) {
    if (txn.tradeId) continue;
    const info = teamInfo(team(txn.teamId));
    const isAdd = txn.type === "WAIVER_ADD" || txn.type === "FREE_AGENT_ADD";
    const isDrop = txn.type === "DROP";
    if (!isAdd && !isDrop) continue;

    drafts.push({
      type: isAdd ? "WAIVER" : "DROP",
      seasonId: txn.seasonId,
      week: txn.week,
      occurredOn: txn.occurredOn,
      template: isAdd ? "waiver_add" : "player_drop",
      data: {
        year: txn.year,
        week: txn.week,
        playerName: txn.playerName,
        position: txn.position,
        faab: txn.faabSpent,
        team: info,
      },
      headline: isAdd
        ? `${info.teamName} picked up ${txn.playerName}`
        : `${info.teamName} dropped ${txn.playerName}`,
      importance: isAdd ? IMPORTANCE.waiver : IMPORTANCE.drop,
      dedupeKey: `${history.leagueId}:${isAdd ? "waiver" : "drop"}:${txn.id}`,
      transactionId: txn.id,
      subjects: [{ userId: info.userId, fantasyTeamId: info.teamId, role: "PRIMARY" }],
    });
  }

  // ---- Early draft picks -------------------------------------------------
  for (const pick of history.draftPicks) {
    if (pick.round > 3 || !pick.playerName || !pick.occurredOn) continue;
    const info = teamInfo(team(pick.teamId));
    drafts.push({
      type: "DRAFT",
      seasonId: pick.seasonId,
      week: null,
      occurredOn: pick.occurredOn,
      template: "draft_pick",
      data: {
        year: pick.year,
        playerName: pick.playerName,
        round: pick.round,
        overallPick: pick.overallPick,
        team: info,
      },
      headline: `${info.teamName} drafted ${pick.playerName} at pick ${pick.overallPick}`,
      importance: IMPORTANCE.draft + Math.max(0, 12 - pick.overallPick),
      dedupeKey: `${history.leagueId}:draft:${pick.id}`,
      subjects: [{ userId: info.userId, fantasyTeamId: info.teamId, role: "PRIMARY" }],
    });
  }

  // ---- Record breaks -----------------------------------------------------
  // Only emit for records that displaced a previous holder — the first entry
  // in a lineage is the record being established, not broken.
  const byKey = new Map<string, RecordDraft[]>();
  for (const record of records) {
    const list = byKey.get(record.key) ?? [];
    list.push(record);
    byKey.set(record.key, list);
  }

  for (const [key, lineage] of byKey) {
    const ordered = [...lineage].sort((a, b) => a.sequence - b.sequence);
    for (const record of ordered) {
      if (record.sequence === 0) continue;
      const previous = ordered[record.sequence - 1];
      const info = record.holderTeamId
        ? teamInfo(team(record.holderTeamId))
        : { teamId: null, teamName: "Unknown team", userId: record.holderUserId ?? null, managerName: "" };

      drafts.push({
        type: "RECORD",
        seasonId: record.seasonId ?? null,
        week: record.week ?? null,
        occurredOn: record.occurredOn,
        template: "record_broken",
        data: {
          recordKey: key,
          recordLabel: record.label,
          displayValue: record.displayValue,
          previousValue: previous.displayValue,
          previousDescription: previous.description,
          week: record.week,
          team: info,
        },
        headline: `League record broken: ${record.label} — ${record.displayValue}`,
        body: record.description,
        importance: IMPORTANCE.recordBroken,
        dedupeKey: `${history.leagueId}:record_broken:${key}:${record.sequence}`,
        matchupId: record.matchupId ?? null,
        recordKey: key,
        subjects: [{ userId: info.userId, fantasyTeamId: info.teamId, role: "PRIMARY" }],
      });
    }
  }

  return drafts;
}
