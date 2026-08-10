import type { RecordCategory } from "@/generated/prisma/enums";
import { formatPoints, formatRecord, winPercentage } from "@/lib/utils";
import { teamGames, type LeagueHistory, type LoadedTeam } from "./load";

export type RecordDraft = {
  category: RecordCategory;
  key: string;
  label: string;
  value: number;
  displayValue: string;
  description: string;
  seasonId?: string | null;
  week?: number | null;
  matchupId?: string | null;
  holderUserId?: string | null;
  holderTeamId?: string | null;
  holderPlayerId?: string | null;
  occurredOn: Date;
  isCurrent: boolean;
  /** Position within a record's lineage; 0 is the first holder ever. */
  sequence: number;
};

type ProgressionEvent = {
  value: number;
  occurredOn: Date;
  seasonId: string;
  week: number;
  matchupId?: string;
  teamId?: string;
  userId?: string | null;
  playerId?: string;
  subject: string;
};

/** Walks events in chronological order and emits a row every time the mark is
 *  beaten. Keeping the whole lineage — not just the current holder — is what
 *  lets the app say "this record stood for three years until…". */
function progression(
  events: ProgressionEvent[],
  compare: (candidate: number, best: number) => boolean,
): ProgressionEvent[] {
  const chronological = [...events].sort(
    (a, b) => a.occurredOn.getTime() - b.occurredOn.getTime() || a.week - b.week,
  );

  const holders: ProgressionEvent[] = [];
  let best: number | null = null;
  for (const event of chronological) {
    if (best === null || compare(event.value, best)) {
      best = event.value;
      holders.push(event);
    }
  }
  return holders;
}

function toDrafts(
  holders: ProgressionEvent[],
  base: {
    category: RecordCategory;
    key: string;
    label: string;
    describe: (event: ProgressionEvent) => string;
    display: (value: number) => string;
  },
): RecordDraft[] {
  return holders.map((event, index) => ({
    category: base.category,
    key: base.key,
    label: base.label,
    value: event.value,
    displayValue: base.display(event.value),
    description: base.describe(event),
    seasonId: event.seasonId,
    week: event.week,
    matchupId: event.matchupId ?? null,
    holderTeamId: event.teamId ?? null,
    holderUserId: event.userId ?? null,
    holderPlayerId: event.playerId ?? null,
    occurredOn: event.occurredOn,
    isCurrent: index === holders.length - 1,
    sequence: index,
  }));
}

export function computeRecords(history: LeagueHistory): RecordDraft[] {
  const drafts: RecordDraft[] = [];
  const team = (id: string) => history.teamsById.get(id);

  // ---- Single-week team scores ------------------------------------------
  const teamWeeks: ProgressionEvent[] = [];
  for (const m of history.matchups) {
    for (const [teamId, score] of [
      [m.homeTeamId, m.homeScore],
      [m.awayTeamId, m.awayScore],
    ] as const) {
      const t = team(teamId);
      teamWeeks.push({
        value: score,
        occurredOn: m.playedOn,
        seasonId: m.seasonId,
        week: m.week,
        matchupId: m.id,
        teamId,
        userId: t?.userId ?? null,
        subject: t?.name ?? "Unknown",
      });
    }
  }

  drafts.push(
    ...toDrafts(
      progression(teamWeeks, (c, b) => c > b),
      {
        category: "TEAM",
        key: "highest_team_score",
        label: "Highest single-week score",
        display: formatPoints,
        describe: (e) => `${e.subject} scored ${formatPoints(e.value)} in week ${e.week}.`,
      },
    ),
  );

  drafts.push(
    ...toDrafts(
      progression(teamWeeks, (c, b) => c < b),
      {
        category: "TEAM",
        key: "lowest_team_score",
        label: "Lowest single-week score",
        display: formatPoints,
        describe: (e) => `${e.subject} managed only ${formatPoints(e.value)} in week ${e.week}.`,
      },
    ),
  );

  // ---- Margins -----------------------------------------------------------
  const margins: ProgressionEvent[] = history.matchups
    .filter((m) => !m.isTie && m.winnerTeamId)
    .map((m) => {
      const winnerId = m.winnerTeamId!;
      const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      const w = team(winnerId);
      const l = team(loserId);
      return {
        value: m.margin,
        occurredOn: m.playedOn,
        seasonId: m.seasonId,
        week: m.week,
        matchupId: m.id,
        teamId: winnerId,
        userId: w?.userId ?? null,
        subject: `${w?.name ?? "?"} over ${l?.name ?? "?"}`,
      };
    });

  drafts.push(
    ...toDrafts(
      progression(margins, (c, b) => c > b),
      {
        category: "TEAM",
        key: "biggest_blowout",
        label: "Biggest blowout",
        display: (v) => `${formatPoints(v)} pts`,
        describe: (e) => `${e.subject} by ${formatPoints(e.value)} in week ${e.week}.`,
      },
    ),
  );

  drafts.push(
    ...toDrafts(
      progression(
        margins.filter((m) => m.value > 0),
        (c, b) => c < b,
      ),
      {
        category: "TEAM",
        key: "closest_game",
        label: "Closest game",
        display: (v) => `${formatPoints(v)} pts`,
        describe: (e) => `${e.subject} by ${formatPoints(e.value)} in week ${e.week}.`,
      },
    ),
  );

  drafts.push(
    ...toDrafts(
      progression(
        history.matchups.map((m) => {
          const h = team(m.homeTeamId);
          const a = team(m.awayTeamId);
          return {
            value: m.combined,
            occurredOn: m.playedOn,
            seasonId: m.seasonId,
            week: m.week,
            matchupId: m.id,
            teamId: m.homeTeamId,
            userId: h?.userId ?? null,
            subject: `${h?.name ?? "?"} vs ${a?.name ?? "?"}`,
          };
        }),
        (c, b) => c > b,
      ),
      {
        category: "TEAM",
        key: "highest_combined_score",
        label: "Highest combined score",
        display: formatPoints,
        describe: (e) => `${e.subject} combined for ${formatPoints(e.value)}.`,
      },
    ),
  );

  // ---- Player performances ----------------------------------------------
  const playerWeeks: ProgressionEvent[] = [];
  for (const m of history.matchups) {
    for (const [teamId, slots] of m.slotsByTeam) {
      const t = team(teamId);
      for (const slot of slots) {
        if (!slot.isStarter) continue;
        playerWeeks.push({
          value: slot.points,
          occurredOn: m.playedOn,
          seasonId: m.seasonId,
          week: m.week,
          matchupId: m.id,
          teamId,
          userId: t?.userId ?? null,
          playerId: slot.playerId,
          subject: `${slot.playerName} (${t?.name ?? "?"})`,
        });
      }
    }
  }

  drafts.push(
    ...toDrafts(
      progression(playerWeeks, (c, b) => c > b),
      {
        category: "PLAYER",
        key: "highest_player_score",
        label: "Highest player score",
        display: formatPoints,
        describe: (e) => `${e.subject} put up ${formatPoints(e.value)} in week ${e.week}.`,
      },
    ),
  );

  // ---- Season totals -----------------------------------------------------
  const completedTeams = history.seasons
    .filter((s) => s.isComplete)
    .flatMap((s) => s.teams);

  drafts.push(...seasonExtreme(completedTeams, "most", history));
  drafts.push(...seasonExtreme(completedTeams, "fewest", history));

  // ---- Streaks -----------------------------------------------------------
  drafts.push(...streakRecords(history));

  // ---- Manager careers ---------------------------------------------------
  drafts.push(...careerRecords(history));

  return drafts;
}

function seasonExtreme(
  teams: LoadedTeam[],
  mode: "most" | "fewest",
  history: LeagueHistory,
): RecordDraft[] {
  if (teams.length === 0) return [];
  const sorted = [...teams].sort((a, b) =>
    mode === "most" ? b.pointsFor - a.pointsFor : a.pointsFor - b.pointsFor,
  );
  const best = sorted[0];
  const season = history.seasonsById.get(best.seasonId);

  return [
    {
      category: "TEAM",
      key: mode === "most" ? "most_points_season" : "fewest_points_season",
      label:
        mode === "most" ? "Most points in a season" : "Fewest points in a season",
      value: best.pointsFor,
      displayValue: formatPoints(best.pointsFor),
      description: `${best.name} scored ${formatPoints(best.pointsFor)} across the ${best.year} season.`,
      seasonId: best.seasonId,
      holderTeamId: best.id,
      holderUserId: best.userId,
      occurredOn: new Date(Date.UTC(season?.year ?? best.year, 11, 20)),
      isCurrent: true,
      sequence: 0,
    },
  ];
}

function streakRecords(history: LeagueHistory): RecordDraft[] {
  let bestWin = { length: 0, team: null as LoadedTeam | null, endedOn: new Date() };
  let worstLoss = { length: 0, team: null as LoadedTeam | null, endedOn: new Date() };

  for (const season of history.seasons) {
    for (const team of season.teams) {
      const games = teamGames(history, team.id);
      let winRun = 0;
      let lossRun = 0;
      for (const game of games) {
        winRun = game.result === "W" ? winRun + 1 : 0;
        lossRun = game.result === "L" ? lossRun + 1 : 0;
        if (winRun > bestWin.length) {
          bestWin = { length: winRun, team, endedOn: game.matchup.playedOn };
        }
        if (lossRun > worstLoss.length) {
          worstLoss = { length: lossRun, team, endedOn: game.matchup.playedOn };
        }
      }
    }
  }

  const drafts: RecordDraft[] = [];
  if (bestWin.team) {
    drafts.push({
      category: "TEAM",
      key: "longest_win_streak",
      label: "Longest winning streak",
      value: bestWin.length,
      displayValue: `${bestWin.length} games`,
      description: `${bestWin.team.name} won ${bestWin.length} straight in ${bestWin.team.year}.`,
      seasonId: bestWin.team.seasonId,
      holderTeamId: bestWin.team.id,
      holderUserId: bestWin.team.userId,
      occurredOn: bestWin.endedOn,
      isCurrent: true,
      sequence: 0,
    });
  }
  if (worstLoss.team) {
    drafts.push({
      category: "TEAM",
      key: "longest_loss_streak",
      label: "Longest losing streak",
      value: worstLoss.length,
      displayValue: `${worstLoss.length} games`,
      description: `${worstLoss.team.name} lost ${worstLoss.length} straight in ${worstLoss.team.year}.`,
      seasonId: worstLoss.team.seasonId,
      holderTeamId: worstLoss.team.id,
      holderUserId: worstLoss.team.userId,
      occurredOn: worstLoss.endedOn,
      isCurrent: true,
      sequence: 0,
    });
  }
  return drafts;
}

export type CareerTotals = {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  championships: number;
  runnerUps: number;
  playoffAppearances: number;
  seasons: number;
  bestWeek: number;
  worstWeek: number;
};

export function computeCareerTotals(history: LeagueHistory): Map<string, CareerTotals> {
  const totals = new Map<string, CareerTotals>();

  const ensure = (userId: string, name: string) => {
    let entry = totals.get(userId);
    if (!entry) {
      entry = {
        userId,
        name,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        championships: 0,
        runnerUps: 0,
        playoffAppearances: 0,
        seasons: 0,
        bestWeek: 0,
        worstWeek: Number.POSITIVE_INFINITY,
      };
      totals.set(userId, entry);
    }
    return entry;
  };

  for (const season of history.seasons) {
    for (const team of season.teams) {
      if (!team.userId) continue;
      const entry = ensure(team.userId, team.managerName ?? "Unknown");
      entry.wins += team.wins;
      entry.losses += team.losses;
      entry.ties += team.ties;
      entry.pointsFor += team.pointsFor;
      entry.pointsAgainst += team.pointsAgainst;
      entry.seasons += 1;
      if (team.madePlayoffs) entry.playoffAppearances += 1;
      if (season.championTeamId === team.id) entry.championships += 1;
      if (season.runnerUpTeamId === team.id) entry.runnerUps += 1;
    }
  }

  for (const m of history.matchups) {
    for (const [teamId, score] of [
      [m.homeTeamId, m.homeScore],
      [m.awayTeamId, m.awayScore],
    ] as const) {
      const team = history.teamsById.get(teamId);
      if (!team?.userId) continue;
      const entry = totals.get(team.userId);
      if (!entry) continue;
      entry.bestWeek = Math.max(entry.bestWeek, score);
      entry.worstWeek = Math.min(entry.worstWeek, score);
    }
  }

  for (const entry of totals.values()) {
    entry.pointsFor = Math.round(entry.pointsFor * 100) / 100;
    entry.pointsAgainst = Math.round(entry.pointsAgainst * 100) / 100;
    if (!Number.isFinite(entry.worstWeek)) entry.worstWeek = 0;
  }

  return totals;
}

function careerRecords(history: LeagueHistory): RecordDraft[] {
  const totals = [...computeCareerTotals(history).values()];
  if (totals.length === 0) return [];

  const now = new Date();
  const leader = <K extends keyof CareerTotals>(
    key: K,
    filter?: (t: CareerTotals) => boolean,
  ) => {
    const pool = filter ? totals.filter(filter) : totals;
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => Number(b[key]) - Number(a[key]))[0];
  };

  const drafts: RecordDraft[] = [];
  const push = (
    key: string,
    label: string,
    entry: CareerTotals | null,
    value: number,
    displayValue: string,
    description: string,
  ) => {
    if (!entry || value <= 0) return;
    drafts.push({
      category: "MANAGER",
      key,
      label,
      value,
      displayValue,
      description,
      holderUserId: entry.userId,
      occurredOn: now,
      isCurrent: true,
      sequence: 0,
    });
  };

  const champs = leader("championships");
  push(
    "most_championships",
    "Most championships",
    champs,
    champs?.championships ?? 0,
    `${champs?.championships ?? 0}`,
    `${champs?.name} has won ${champs?.championships} title${champs?.championships === 1 ? "" : "s"}.`,
  );

  const wins = leader("wins");
  push(
    "most_career_wins",
    "Most career wins",
    wins,
    wins?.wins ?? 0,
    `${wins?.wins ?? 0}`,
    `${wins?.name} is ${formatRecord(wins?.wins ?? 0, wins?.losses ?? 0, wins?.ties ?? 0)} all time.`,
  );

  const points = leader("pointsFor");
  push(
    "most_career_points",
    "Most career points",
    points,
    points?.pointsFor ?? 0,
    formatPoints(points?.pointsFor ?? 0),
    `${points?.name} has scored ${formatPoints(points?.pointsFor ?? 0)} across ${points?.seasons} seasons.`,
  );

  const playoffs = leader("playoffAppearances");
  push(
    "most_playoff_appearances",
    "Most playoff appearances",
    playoffs,
    playoffs?.playoffAppearances ?? 0,
    `${playoffs?.playoffAppearances ?? 0}`,
    `${playoffs?.name} has made the playoffs ${playoffs?.playoffAppearances} times.`,
  );

  // Require two seasons so one hot year cannot claim the career mark.
  const eligible = totals.filter((t) => t.seasons >= 2);
  const byPct = [...eligible].sort(
    (a, b) =>
      winPercentage(b.wins, b.losses, b.ties) - winPercentage(a.wins, a.losses, a.ties),
  )[0];
  if (byPct) {
    const pct = winPercentage(byPct.wins, byPct.losses, byPct.ties);
    drafts.push({
      category: "MANAGER",
      key: "best_win_percentage",
      label: "Best winning percentage",
      value: Math.round(pct * 10000) / 100,
      displayValue: `${(pct * 100).toFixed(1)}%`,
      description: `${byPct.name} is ${formatRecord(byPct.wins, byPct.losses, byPct.ties)} across ${byPct.seasons} seasons.`,
      holderUserId: byPct.userId,
      occurredOn: now,
      isCurrent: true,
      sequence: 0,
    });
  }

  return drafts;
}
