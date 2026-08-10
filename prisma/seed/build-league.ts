import type { PrismaClient } from "../../src/generated/prisma/client";
import type {
  LineupSlot,
  MatchupType,
  PlayerPosition,
  TransactionType,
} from "../../src/generated/prisma/enums";
import type { Rng } from "./rng";
import { PLAYERS, TEAM_NAMES, type SeedManager, type SeedPlayer } from "./data";

/** Deterministic ids so a reset reproduces the same rows and debugging a
 *  seeded record means something across runs. */
let counter = 0;
const id = (prefix: string) => `sd_${prefix}_${(counter++).toString(36)}`;
export const resetIdCounter = () => {
  counter = 0;
};

const STARTER_SLOTS: LineupSlot[] = [
  "QB",
  "RB",
  "RB",
  "WR",
  "WR",
  "WR",
  "TE",
  "FLEX",
  "K",
  "DST",
];
const FLEX_ELIGIBLE: PlayerPosition[] = ["RB", "WR", "TE"];
const ROSTER_SIZE = 15;
const MIN_BY_POSITION: Partial<Record<PlayerPosition, number>> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 1,
  K: 1,
  DST: 1,
};
/** Rough 12-team replacement level, so draft boards value scarcity instead of
 *  sending every quarterback in the first round. */
const REPLACEMENT: Partial<Record<PlayerPosition, number>> = {
  QB: 15,
  RB: 9,
  WR: 9.5,
  TE: 7,
  K: 8,
  DST: 6.5,
};

type LeagueConfig = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  secondColor: string;
  foundedYear: number;
  teamCount: number;
};

type Ctx = {
  db: PrismaClient;
  rng: Rng;
  userIdByEmail: Map<string, string>;
  playerIdByName: Map<string, string>;
};

type RosterEntry = { player: SeedPlayer; playerId: string };

export async function buildLeague(
  ctx: Ctx,
  config: LeagueConfig,
  managers: SeedManager[],
  years: number[],
) {
  const { db, rng } = ctx;

  const leagueId = id("lg");
  await db.league.create({
    data: {
      id: leagueId,
      slug: config.slug,
      name: config.name,
      tagline: config.tagline,
      description: config.description,
      accentColor: config.accentColor,
      secondColor: config.secondColor,
      foundedYear: config.foundedYear,
      provider: "MANUAL",
      settings: {
        create: {
          teamCount: managers.length,
          playoffTeamCount: 6,
          regularSeasonWeeks: 14,
          playoffWeeks: 3,
          tradeDeadlineWeek: 11,
          faabBudget: 100,
          rosterSlots: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 5 },
        },
      },
      memberships: {
        create: managers.map((m, i) => ({
          userId: ctx.userIdByEmail.get(m.email)!,
          role: i === 0 ? ("COMMISSIONER" as const) : ("MEMBER" as const),
        })),
      },
    },
  });

  // One franchise per manager: the slot that persists while team names change.
  const franchises = managers.map((manager, index) => ({
    id: id("fr"),
    manager,
    index,
  }));

  await db.franchise.createMany({
    data: franchises.map((f) => ({
      id: f.id,
      leagueId,
      providerFranchiseId: `${config.slug}-${f.index + 1}`,
      name: f.manager.name,
    })),
  });

  const nameOffsets = rng.shuffle(TEAM_NAMES.map((_, i) => i));

  for (const [seasonIndex, year] of years.entries()) {
    await buildSeason(ctx, {
      leagueId,
      config,
      year,
      seasonIndex,
      isFinalYear: seasonIndex === years.length - 1,
      franchises,
      nameOffsets,
    });
  }

  return leagueId;
}

type SeasonArgs = {
  leagueId: string;
  config: LeagueConfig;
  year: number;
  seasonIndex: number;
  isFinalYear: boolean;
  franchises: { id: string; manager: SeedManager; index: number }[];
  nameOffsets: number[];
};

async function buildSeason(ctx: Ctx, args: SeasonArgs) {
  const { db, rng } = ctx;
  const { leagueId, year, franchises, isFinalYear } = args;

  const regularSeasonWeeks = 14;
  const playoffWeeks = 3;
  // The current season is mid-flight; everything older is finished.
  const currentWeek = isFinalYear ? 9 : regularSeasonWeeks + playoffWeeks;

  const seasonId = id("se");
  await db.season.create({
    data: {
      id: seasonId,
      leagueId,
      year,
      status: isFinalYear ? "IN_PROGRESS" : "COMPLETE",
      currentWeek,
      regularSeasonWeeks,
      playoffWeeks,
      startDate: new Date(Date.UTC(year, 8, 5)),
      endDate: isFinalYear ? null : new Date(Date.UTC(year, 11, 28)),
    },
  });

  const teams = franchises.map((franchise, i) => {
    const nameIndex =
      (args.nameOffsets[i] + args.seasonIndex * 5) % TEAM_NAMES.length;
    return {
      id: id("ft"),
      franchiseId: franchise.id,
      manager: franchise.manager,
      name: TEAM_NAMES[nameIndex],
      seed: i,
    };
  });

  await db.fantasyTeam.createMany({
    data: teams.map((t, i) => ({
      id: t.id,
      seasonId,
      franchiseId: t.franchiseId,
      providerTeamId: `${year}-${i + 1}`,
      name: t.name,
      abbreviation: abbreviate(t.name),
      source: "SEED" as const,
    })),
  });

  await db.teamMembership.createMany({
    data: teams.map((t) => ({
      id: id("tm"),
      userId: ctx.userIdByEmail.get(t.manager.email)!,
      fantasyTeamId: t.id,
    })),
  });

  // ---- Draft -------------------------------------------------------------
  const { rosters, picks } = runDraft(ctx, teams, year);

  await db.draftPick.createMany({
    data: picks.map((p) => ({
      id: id("dp"),
      seasonId,
      fantasyTeamId: p.teamId,
      playerId: p.playerId,
      round: p.round,
      pickInRound: p.pickInRound,
      overallPick: p.overallPick,
      occurredOn: draftDate(year),
    })),
  });

  // ---- Regular season ----------------------------------------------------
  const schedule = roundRobin(
    teams.map((t) => t.id),
    regularSeasonWeeks,
    rng,
  );

  const matchupRows: MatchupRow[] = [];
  const lineupRows: LineupRow[] = [];
  const standings = new Map(
    teams.map((t) => [
      t.id,
      { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 },
    ]),
  );

  const playedWeeks = isFinalYear
    ? Math.min(currentWeek - 1, regularSeasonWeeks)
    : regularSeasonWeeks;

  for (let week = 1; week <= regularSeasonWeeks; week++) {
    const complete = week <= playedWeeks;
    for (const [homeId, awayId] of schedule[week - 1]) {
      const home = simulateTeamWeek(ctx, rosters.get(homeId)!, complete);
      const away = simulateTeamWeek(ctx, rosters.get(awayId)!, complete);

      const matchupId = id("mu");
      matchupRows.push({
        id: matchupId,
        seasonId,
        week,
        type: "REGULAR",
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore: home.total,
        awayScore: away.total,
        winnerTeamId: complete
          ? home.total === away.total
            ? null
            : home.total > away.total
              ? homeId
              : awayId
          : null,
        isTie: complete && home.total === away.total,
        isComplete: complete,
        playedOn: weekDate(year, week),
      });

      if (complete) {
        pushLineup(lineupRows, matchupId, homeId, home);
        pushLineup(lineupRows, matchupId, awayId, away);
        recordResult(standings, homeId, awayId, home.total, away.total);
      }
    }
  }

  // ---- Standings ---------------------------------------------------------
  const ranked = [...teams].sort((a, b) => {
    const sa = standings.get(a.id)!;
    const sb = standings.get(b.id)!;
    if (sb.wins !== sa.wins) return sb.wins - sa.wins;
    return sb.pointsFor - sa.pointsFor;
  });

  // ---- Playoffs ----------------------------------------------------------
  let championId: string | null = null;
  let runnerUpId: string | null = null;
  let bracketPlacements: string[] = [];

  if (!isFinalYear) {
    const bracket = simulatePlayoffs(
      ctx,
      ranked.map((t) => t.id),
      rosters,
      seasonId,
      year,
      regularSeasonWeeks,
      matchupRows,
      lineupRows,
    );
    championId = bracket.championId;
    runnerUpId = bracket.runnerUpId;
    bracketPlacements = bracket.placements;
  }

  await db.matchup.createMany({ data: matchupRows });
  await createInChunks(db, lineupRows);

  const playoffTeamIds = new Set(ranked.slice(0, 6).map((t) => t.id));

  // Playoff results decide the top six; everyone else falls in behind them in
  // regular-season order. Building the list in one pass keeps ranks unique.
  const finalOrder = [
    ...bracketPlacements,
    ...ranked.map((t) => t.id).filter((teamId) => !bracketPlacements.includes(teamId)),
  ];
  const finalRankById = new Map(finalOrder.map((teamId, i) => [teamId, i + 1]));

  await Promise.all(
    ranked.map((team, index) => {
      const s = standings.get(team.id)!;
      return db.fantasyTeam.update({
        where: { id: team.id },
        data: {
          wins: s.wins,
          losses: s.losses,
          ties: s.ties,
          pointsFor: round2(s.pointsFor),
          pointsAgainst: round2(s.pointsAgainst),
          regularSeasonRank: index + 1,
          finalRank: isFinalYear ? null : finalRankById.get(team.id),
          madePlayoffs: !isFinalYear && playoffTeamIds.has(team.id),
        },
      });
    }),
  );

  if (championId) {
    await ctx.db.season.update({
      where: { id: seasonId },
      data: { championTeamId: championId, runnerUpTeamId: runnerUpId },
    });
  }

  // ---- Transactions ------------------------------------------------------
  await buildTransactions(ctx, {
    seasonId,
    year,
    teams,
    rosters,
    playedWeeks,
  });

  return seasonId;
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

type DraftPickRow = {
  teamId: string;
  playerId: string;
  round: number;
  pickInRound: number;
  overallPick: number;
};

function runDraft(
  ctx: Ctx,
  teams: { id: string }[],
  year: number,
): { rosters: Map<string, RosterEntry[]>; picks: DraftPickRow[] } {
  const { rng } = ctx;

  // Each season gets its own board noise, so franchises are not permanently
  // good or bad — dynasties have to be earned by the simulation.
  const board = PLAYERS.map((player) => ({
    player,
    value:
      player.mean -
      (REPLACEMENT[player.position] ?? 8) +
      rng.normal(0, 1.6),
  })).sort((a, b) => b.value - a.value);

  const available = new Set(board.map((b) => b.player.name));
  const rosters = new Map<string, RosterEntry[]>(teams.map((t) => [t.id, []]));
  const picks: DraftPickRow[] = [];
  const order = rng.shuffle(teams.map((t) => t.id));

  let overall = 1;
  for (let round = 1; round <= ROSTER_SIZE; round++) {
    const roundOrder = round % 2 === 1 ? order : [...order].reverse();

    roundOrder.forEach((teamId, indexInRound) => {
      const roster = rosters.get(teamId)!;
      const counts = countPositions(roster);
      const remaining = ROSTER_SIZE - roster.length;

      // Reserve the last picks for whatever minimum slots are still open, so
      // no team ends the draft unable to field a legal lineup.
      const unmet = unmetMinimums(counts);
      const mustFill = remaining <= unmet.total;

      const candidate = board.find(({ player }) => {
        if (!available.has(player.name)) return false;
        if (mustFill) return unmet.positions.has(player.position);
        return true;
      });

      const chosen = candidate ?? board.find((b) => available.has(b.player.name));
      if (!chosen) return;

      available.delete(chosen.player.name);
      roster.push({
        player: chosen.player,
        playerId: ctx.playerIdByName.get(chosen.player.name)!,
      });
      picks.push({
        teamId,
        playerId: ctx.playerIdByName.get(chosen.player.name)!,
        round,
        pickInRound: indexInRound + 1,
        overallPick: overall++,
      });
    });
  }

  void year;
  return { rosters, picks };
}

function countPositions(roster: RosterEntry[]) {
  const counts: Partial<Record<PlayerPosition, number>> = {};
  for (const entry of roster) {
    counts[entry.player.position] = (counts[entry.player.position] ?? 0) + 1;
  }
  return counts;
}

function unmetMinimums(counts: Partial<Record<PlayerPosition, number>>) {
  const positions = new Set<PlayerPosition>();
  let total = 0;
  for (const [position, min] of Object.entries(MIN_BY_POSITION)) {
    const have = counts[position as PlayerPosition] ?? 0;
    if (have < min) {
      positions.add(position as PlayerPosition);
      total += min - have;
    }
  }
  return { positions, total };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

type SimResult = {
  total: number;
  lineup: { entry: RosterEntry; slot: LineupSlot; points: number; projected: number }[];
};

/** Starters are chosen from *projections*, scores come from actuals. That gap
 *  is what produces bench points and "you should have started him" moments. */
function simulateTeamWeek(ctx: Ctx, roster: RosterEntry[], complete: boolean): SimResult {
  const { rng } = ctx;

  const scored = roster.map((entry) => {
    const projected = Math.max(0, entry.player.mean + rng.normal(0, 1.2));
    // 4% chance of a dud (injury, ejection, benching in a blowout).
    const actual = rng.bool(0.04)
      ? rng.float(0, 3)
      : Math.max(0, rng.normal(entry.player.mean, entry.player.stdDev));
    return { entry, projected: round2(projected), points: round2(complete ? actual : 0) };
  });

  const pool = [...scored].sort((a, b) => b.projected - a.projected);
  const used = new Set<RosterEntry>();
  const lineup: SimResult["lineup"] = [];

  for (const slot of STARTER_SLOTS) {
    const eligible = pool.find((c) => {
      if (used.has(c.entry)) return false;
      if (slot === "FLEX") return FLEX_ELIGIBLE.includes(c.entry.player.position);
      return c.entry.player.position === (slot as string);
    });
    if (!eligible) continue;
    used.add(eligible.entry);
    lineup.push({ ...eligible, slot });
  }

  for (const c of scored) {
    if (!used.has(c.entry)) lineup.push({ ...c, slot: "BENCH" });
  }

  const total = round2(
    lineup
      .filter((l) => l.slot !== "BENCH")
      .reduce((sum, l) => sum + l.points, 0),
  );

  return { total, lineup };
}

type MatchupRow = {
  id: string;
  seasonId: string;
  week: number;
  type: MatchupType;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  isTie: boolean;
  isComplete: boolean;
  playedOn: Date;
};

type LineupRow = {
  id: string;
  matchupId: string;
  fantasyTeamId: string;
  playerId: string;
  slot: LineupSlot;
  isStarter: boolean;
  points: number;
  projectedPoints: number;
};

function pushLineup(
  rows: LineupRow[],
  matchupId: string,
  teamId: string,
  result: SimResult,
) {
  for (const l of result.lineup) {
    rows.push({
      id: id("mp"),
      matchupId,
      fantasyTeamId: teamId,
      playerId: l.entry.playerId,
      slot: l.slot,
      isStarter: l.slot !== "BENCH",
      points: l.points,
      projectedPoints: l.projected,
    });
  }
}

function recordResult(
  standings: Map<
    string,
    { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number }
  >,
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number,
) {
  const home = standings.get(homeId)!;
  const away = standings.get(awayId)!;
  home.pointsFor += homeScore;
  home.pointsAgainst += awayScore;
  away.pointsFor += awayScore;
  away.pointsAgainst += homeScore;

  if (homeScore === awayScore) {
    home.ties++;
    away.ties++;
  } else if (homeScore > awayScore) {
    home.wins++;
    away.losses++;
  } else {
    away.wins++;
    home.losses++;
  }
}

function simulatePlayoffs(
  ctx: Ctx,
  seedOrder: string[],
  rosters: Map<string, RosterEntry[]>,
  seasonId: string,
  year: number,
  regularSeasonWeeks: number,
  matchupRows: MatchupRow[],
  lineupRows: LineupRow[],
) {
  const seeds = seedOrder.slice(0, 6);

  const play = (
    week: number,
    type: MatchupType,
    homeId: string,
    awayId: string,
  ): string => {
    const home = simulateTeamWeek(ctx, rosters.get(homeId)!, true);
    const away = simulateTeamWeek(ctx, rosters.get(awayId)!, true);
    // A tied playoff game is decided by seed, so the bracket always resolves.
    const homeWins =
      home.total === away.total
        ? seeds.indexOf(homeId) < seeds.indexOf(awayId)
        : home.total > away.total;

    const matchupId = id("mu");
    matchupRows.push({
      id: matchupId,
      seasonId,
      week,
      type,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: home.total,
      awayScore: away.total,
      winnerTeamId: homeWins ? homeId : awayId,
      isTie: false,
      isComplete: true,
      playedOn: weekDate(year, week),
    });
    pushLineup(lineupRows, matchupId, homeId, home);
    pushLineup(lineupRows, matchupId, awayId, away);

    return homeWins ? homeId : awayId;
  };

  const w1 = regularSeasonWeeks + 1;
  const winner36 = play(w1, "QUARTERFINAL", seeds[2], seeds[5]);
  const winner45 = play(w1, "QUARTERFINAL", seeds[3], seeds[4]);
  const qfLosers = [
    winner36 === seeds[2] ? seeds[5] : seeds[2],
    winner45 === seeds[3] ? seeds[4] : seeds[3],
  ];

  const semi1 = play(w1 + 1, "SEMIFINAL", seeds[0], winner45);
  const semi2 = play(w1 + 1, "SEMIFINAL", seeds[1], winner36);

  const loser1 = semi1 === seeds[0] ? winner45 : seeds[0];
  const loser2 = semi2 === seeds[1] ? winner36 : seeds[1];

  const championId = play(w1 + 2, "CHAMPIONSHIP", semi1, semi2);
  const runnerUpId = championId === semi1 ? semi2 : semi1;
  const thirdId = play(w1 + 2, "THIRD_PLACE", loser1, loser2);
  const fourthId = thirdId === loser1 ? loser2 : loser1;

  return {
    championId,
    runnerUpId,
    // Finishing order for the six playoff teams, best to worst.
    placements: [
      championId,
      runnerUpId,
      thirdId,
      fourthId,
      ...qfLosers.sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b)),
    ],
  };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

async function buildTransactions(
  ctx: Ctx,
  args: {
    seasonId: string;
    year: number;
    teams: { id: string }[];
    rosters: Map<string, RosterEntry[]>;
    playedWeeks: number;
  },
) {
  const { db, rng } = ctx;
  const { seasonId, year, teams, rosters, playedWeeks } = args;

  const rostered = new Set<string>();
  for (const roster of rosters.values()) {
    for (const entry of roster) rostered.add(entry.player.name);
  }
  const freeAgents = PLAYERS.filter((p) => !rostered.has(p.name));

  const transactions: {
    id: string;
    seasonId: string;
    fantasyTeamId: string;
    playerId: string;
    type: TransactionType;
    week: number;
    occurredOn: Date;
    faabSpent: number | null;
    tradeId: string | null;
    providerTxnId: string;
  }[] = [];

  let txnSeq = 0;

  // Waiver adds and the corresponding drops.
  for (let week = 1; week <= playedWeeks; week++) {
    const movers = rng.sample(teams, rng.int(1, Math.max(2, Math.floor(teams.length / 3))));
    for (const team of movers) {
      if (freeAgents.length === 0) break;
      const target = rng.pick(freeAgents);
      const roster = rosters.get(team.id)!;
      const dropped = roster[rng.int(Math.floor(roster.length / 2), roster.length - 1)];
      if (!dropped) continue;

      const when = weekDate(year, week, 2);
      transactions.push({
        id: id("tx"),
        seasonId,
        fantasyTeamId: team.id,
        playerId: ctx.playerIdByName.get(target.name)!,
        type: rng.bool(0.65) ? "WAIVER_ADD" : "FREE_AGENT_ADD",
        week,
        occurredOn: when,
        faabSpent: rng.bool(0.65) ? rng.int(1, 42) : null,
        tradeId: null,
        providerTxnId: `${year}-t${txnSeq++}`,
      });
      transactions.push({
        id: id("tx"),
        seasonId,
        fantasyTeamId: team.id,
        playerId: dropped.playerId,
        type: "DROP",
        week,
        occurredOn: when,
        faabSpent: null,
        tradeId: null,
        providerTxnId: `${year}-t${txnSeq++}`,
      });
    }
  }

  // Trades: two teams swap one player each.
  const trades: { id: string; seasonId: string; week: number; occurredOn: Date; providerTradeId: string }[] = [];
  const tradeItems: {
    id: string;
    tradeId: string;
    fromTeamId: string;
    toTeamId: string;
    playerId: string;
  }[] = [];

  const tradeCount = rng.int(3, 8);
  for (let i = 0; i < tradeCount; i++) {
    const week = rng.int(2, Math.max(3, Math.min(11, playedWeeks)));
    const [teamA, teamB] = rng.sample(teams, 2);
    const rosterA = rosters.get(teamA.id)!;
    const rosterB = rosters.get(teamB.id)!;
    const playerA = rng.pick(rosterA.slice(0, 8));
    const playerB = rng.pick(rosterB.slice(0, 8));
    if (!playerA || !playerB) continue;

    const tradeId = id("tr");
    const when = weekDate(year, week, 3);
    trades.push({
      id: tradeId,
      seasonId,
      week,
      occurredOn: when,
      providerTradeId: `${year}-tr${i}`,
    });
    tradeItems.push(
      {
        id: id("ti"),
        tradeId,
        fromTeamId: teamA.id,
        toTeamId: teamB.id,
        playerId: playerA.playerId,
      },
      {
        id: id("ti"),
        tradeId,
        fromTeamId: teamB.id,
        toTeamId: teamA.id,
        playerId: playerB.playerId,
      },
    );
    transactions.push(
      {
        id: id("tx"),
        seasonId,
        fantasyTeamId: teamB.id,
        playerId: playerA.playerId,
        type: "TRADE",
        week,
        occurredOn: when,
        faabSpent: null,
        tradeId,
        providerTxnId: `${year}-t${txnSeq++}`,
      },
      {
        id: id("tx"),
        seasonId,
        fantasyTeamId: teamA.id,
        playerId: playerB.playerId,
        type: "TRADE",
        week,
        occurredOn: when,
        faabSpent: null,
        tradeId,
        providerTxnId: `${year}-t${txnSeq++}`,
      },
    );
  }

  if (trades.length) await db.trade.createMany({ data: trades });
  if (tradeItems.length) await db.tradeItem.createMany({ data: tradeItems });
  if (transactions.length) await db.rosterTransaction.createMany({ data: transactions });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Circle method. Rotates all but the first team, repeating once the full
 *  cycle is exhausted so 14 weeks works for both 10- and 12-team leagues. */
function roundRobin(
  teamIds: string[],
  weeks: number,
  rng: Rng,
): Array<Array<[string, string]>> {
  const teams = rng.shuffle(teamIds);
  const n = teams.length;
  const rounds: Array<Array<[string, string]>> = [];

  const rotation = [...teams];
  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    rotation.splice(1, 0, rotation.pop()!);
  }

  return Array.from({ length: weeks }, (_, w) => rounds[w % rounds.length]);
}

function abbreviate(name: string): string {
  const words = name.replace(/[^a-zA-Z ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
}

/** NFL weeks start the Thursday after Labor Day; close enough for anniversaries. */
function weekDate(year: number, week: number, dayOffset = 0): Date {
  const kickoff = Date.UTC(year, 8, 5);
  return new Date(kickoff + ((week - 1) * 7 + dayOffset) * 86_400_000);
}

function draftDate(year: number): Date {
  return new Date(Date.UTC(year, 7, 26, 19));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Lineup rows run to tens of thousands; chunk so no single insert is huge. */
async function createInChunks(db: PrismaClient, rows: LineupRow[], size = 2000) {
  for (let i = 0; i < rows.length; i += size) {
    await db.matchupPlayer.createMany({ data: rows.slice(i, i + size) });
  }
}
