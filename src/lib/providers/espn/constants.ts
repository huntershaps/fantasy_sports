import type {
  LineupSlot,
  MatchupType,
  PlayerPosition,
} from "@/generated/prisma/enums";

/** ESPN's lineupSlotId values. 20 is bench and 21 is IR — those two are the
 *  ones that decide whether a player's points counted. */
export const LINEUP_SLOT_BY_ID: Record<number, LineupSlot> = {
  0: "QB",
  1: "QB", // TQB — team quarterback
  2: "RB",
  3: "FLEX", // RB/WR
  4: "WR",
  5: "FLEX", // WR/TE
  6: "TE",
  7: "SUPER_FLEX", // OP — any offensive player
  8: "DL",
  9: "DL",
  10: "LB",
  11: "DL",
  12: "DB",
  13: "DB",
  14: "DB",
  15: "DB",
  16: "DST",
  17: "K",
  18: "BENCH", // P — punter, treated as a bench-equivalent oddity
  19: "BENCH", // HC — head coach
  20: "BENCH",
  21: "IR",
  23: "FLEX",
  24: "DL", // EDR — edge rusher
};

export const BENCH_SLOT_IDS = new Set([20, 21]);

export const POSITION_BY_ID: Record<number, PlayerPosition> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  7: "QB",
  9: "DL",
  10: "DL",
  11: "LB",
  12: "DB",
  13: "DB",
  14: "DB",
  16: "DST",
};

/** proTeamId → abbreviation. Index 0 is free agency. */
export const PRO_TEAM_BY_ID: Record<number, string> = {
  0: "FA",
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WAS",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

/** ESPN transaction types that map onto our roster transaction vocabulary. */
export const TRANSACTION_TYPE_BY_ESPN: Record<string, string> = {
  WAIVER: "WAIVER_ADD",
  FREEAGENT: "FREE_AGENT_ADD",
  TRADE_ACCEPT: "TRADE",
  DRAFT: "DRAFT",
  ROSTER: "COMMISSIONER",
};

/**
 * Approximate calendar date for a fantasy week.
 *
 * ESPN's schedule carries no date, only a matchup period. Without one every
 * imported game would land on the import date, which would wreck anniversaries
 * — the whole premise of the archive. NFL week 1 opens the Thursday after the
 * first Monday in September; each later week is seven days on. Good enough to
 * put a game in the right week of the right year.
 */
export function approximateWeekDate(seasonYear: number, week: number): Date {
  const september = new Date(Date.UTC(seasonYear, 8, 1));
  const dayOfWeek = september.getUTCDay(); // 0 = Sunday
  const daysToMonday = (8 - dayOfWeek) % 7;
  const laborDay = 1 + daysToMonday; // first Monday in September
  const kickoffThursday = laborDay + 3;
  return new Date(
    Date.UTC(seasonYear, 8, kickoffThursday + (Math.max(1, week) - 1) * 7),
  );
}

/** Playoff bracket labelling. ESPN marks bracket games with playoffTierType;
 *  the specific round has to be inferred from how deep into the playoffs the
 *  matchup period sits. */
export function matchupTypeFor(
  playoffTierType: string | undefined,
  week: number,
  regularSeasonWeeks: number,
  playoffWeeks: number,
): MatchupType {
  if (!playoffTierType || playoffTierType === "NONE") return "REGULAR";
  if (playoffTierType !== "WINNERS_BRACKET") return "CONSOLATION";

  const round = week - regularSeasonWeeks; // 1-indexed within the bracket
  if (round >= playoffWeeks) return "CHAMPIONSHIP";
  if (round === playoffWeeks - 1) return "SEMIFINAL";
  if (round === playoffWeeks - 2) return "QUARTERFINAL";
  return "PLAYOFF";
}
