import { formatPoints } from "@/lib/utils";
import { teamGames, type LeagueHistory, type LoadedSeason } from "./load";

export type AwardDraft = {
  definitionKey: string;
  seasonId: string | null;
  week: number | null;
  userId: string | null;
  fantasyTeamId: string | null;
  playerId: string | null;
  matchupId: string | null;
  titleOverride?: string | null;
  description: string;
  stats: Record<string, unknown>;
  awardedOn: Date;
  isFeatured: boolean;
  dedupeKey: string;
};

/** One pass per completed season plus a few all-time superlatives. Each rule
 *  maps to a key in the built-in award catalog. */
export function computeAwards(history: LeagueHistory): AwardDraft[] {
  const drafts: AwardDraft[] = [];
  const team = (id: string) => history.teamsById.get(id);

  for (const season of history.seasons) {
    if (!season.isComplete) continue;
    drafts.push(...seasonAwards(history, season));
  }

  // ---- All-time superlatives --------------------------------------------
  const completedTeams = history.seasons
    .filter((s) => s.isComplete)
    .flatMap((s) => s.teams);

  if (completedTeams.length > 0) {
    const greatest = [...completedTeams].sort(
      (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor,
    )[0];
    drafts.push({
      definitionKey: "greatest_season",
      seasonId: greatest.seasonId,
      week: null,
      userId: greatest.userId,
      fantasyTeamId: greatest.id,
      playerId: null,
      matchupId: null,
      titleOverride: `Greatest Season — ${greatest.year}`,
      description: `${greatest.name} went ${greatest.wins}-${greatest.losses} and scored ${formatPoints(greatest.pointsFor)} in ${greatest.year}.`,
      stats: {
        wins: greatest.wins,
        losses: greatest.losses,
        pointsFor: greatest.pointsFor,
        year: greatest.year,
      },
      awardedOn: seasonEnd(greatest.year),
      isFeatured: true,
      dedupeKey: `${history.leagueId}:greatest_season`,
    });

    const worst = [...completedTeams].sort(
      (a, b) => a.wins - b.wins || a.pointsFor - b.pointsFor,
    )[0];
    drafts.push({
      definitionKey: "worst_season",
      seasonId: worst.seasonId,
      week: null,
      userId: worst.userId,
      fantasyTeamId: worst.id,
      playerId: null,
      matchupId: null,
      titleOverride: `Worst Season — ${worst.year}`,
      description: `${worst.name} went ${worst.wins}-${worst.losses} and scored just ${formatPoints(worst.pointsFor)} in ${worst.year}.`,
      stats: {
        wins: worst.wins,
        losses: worst.losses,
        pointsFor: worst.pointsFor,
        year: worst.year,
      },
      awardedOn: seasonEnd(worst.year),
      isFeatured: false,
      dedupeKey: `${history.leagueId}:worst_season`,
    });
  }

  void team;
  return drafts;
}

function seasonAwards(history: LeagueHistory, season: LoadedSeason): AwardDraft[] {
  const drafts: AwardDraft[] = [];
  const teams = season.teams;
  if (teams.length === 0) return drafts;

  const seasonMatchups = history.matchups.filter((m) => m.seasonId === season.id);
  const awardedOn = seasonEnd(season.year);
  const key = (name: string) => `${history.leagueId}:${season.id}:${name}`;

  const add = (
    definitionKey: string,
    teamId: string | null,
    description: string,
    stats: Record<string, unknown>,
    extra: Partial<AwardDraft> = {},
  ) => {
    const t = teamId ? history.teamsById.get(teamId) : null;
    drafts.push({
      definitionKey,
      seasonId: season.id,
      week: null,
      userId: t?.userId ?? null,
      fantasyTeamId: t?.id ?? null,
      playerId: null,
      matchupId: null,
      description,
      stats: { year: season.year, ...stats },
      awardedOn,
      isFeatured: false,
      dedupeKey: key(definitionKey),
      ...extra,
    });
  };

  // Champion / runner-up / third
  if (season.championTeamId) {
    const champ = history.teamsById.get(season.championTeamId);
    const final = seasonMatchups.find((m) => m.type === "CHAMPIONSHIP");
    if (champ) {
      add(
        "league_champion",
        champ.id,
        `${champ.name} won the ${season.year} championship.`,
        { wins: champ.wins, losses: champ.losses, pointsFor: champ.pointsFor },
        {
          titleOverride: `${season.year} League Champion`,
          isFeatured: true,
          matchupId: final?.id ?? null,
        },
      );
    }
  }
  if (season.runnerUpTeamId) {
    const up = history.teamsById.get(season.runnerUpTeamId);
    if (up) {
      add("runner_up", up.id, `${up.name} lost the ${season.year} championship game.`, {
        wins: up.wins,
        losses: up.losses,
      });
    }
  }
  const third = teams.find((t) => t.finalRank === 3);
  if (third) {
    add("third_place", third.id, `${third.name} finished third in ${season.year}.`, {
      finalRank: 3,
    });
  }

  // Regular season leaders
  const byPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  add(
    "points_champion",
    byPoints.id,
    `${byPoints.name} led the league with ${formatPoints(byPoints.pointsFor)} points.`,
    { pointsFor: byPoints.pointsFor },
  );

  const byWins = [...teams].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)[0];
  add("most_wins", byWins.id, `${byWins.name} finished ${byWins.wins}-${byWins.losses}.`, {
    wins: byWins.wins,
    losses: byWins.losses,
  });

  // Single-week extremes
  const weekScores = seasonMatchups.flatMap((m) => [
    { teamId: m.homeTeamId, score: m.homeScore, week: m.week, matchupId: m.id },
    { teamId: m.awayTeamId, score: m.awayScore, week: m.week, matchupId: m.id },
  ]);

  if (weekScores.length > 0) {
    const high = [...weekScores].sort((a, b) => b.score - a.score)[0];
    const highTeam = history.teamsById.get(high.teamId);
    add(
      "highest_scoring_week",
      high.teamId,
      `${highTeam?.name} scored ${formatPoints(high.score)} in week ${high.week}.`,
      { points: high.score, week: high.week },
      { week: high.week, matchupId: high.matchupId, isFeatured: true },
    );

    const low = [...weekScores].sort((a, b) => a.score - b.score)[0];
    const lowTeam = history.teamsById.get(low.teamId);
    add(
      "lowest_scoring_week",
      low.teamId,
      `${lowTeam?.name} scored only ${formatPoints(low.score)} in week ${low.week}.`,
      { points: low.score, week: low.week },
      { week: low.week, matchupId: low.matchupId },
    );
  }

  // Margins
  const decided = seasonMatchups.filter((m) => !m.isTie && m.winnerTeamId);
  if (decided.length > 0) {
    const blowout = [...decided].sort((a, b) => b.margin - a.margin)[0];
    const bWinner = history.teamsById.get(blowout.winnerTeamId!);
    const bLoser = history.teamsById.get(
      blowout.winnerTeamId === blowout.homeTeamId ? blowout.awayTeamId : blowout.homeTeamId,
    );
    add(
      "biggest_blowout",
      blowout.winnerTeamId,
      `${bWinner?.name} beat ${bLoser?.name} by ${formatPoints(blowout.margin)} in week ${blowout.week}.`,
      { margin: blowout.margin, week: blowout.week },
      { week: blowout.week, matchupId: blowout.id },
    );

    const closest = [...decided].sort((a, b) => a.margin - b.margin)[0];
    const cWinner = history.teamsById.get(closest.winnerTeamId!);
    const cLoser = history.teamsById.get(
      closest.winnerTeamId === closest.homeTeamId ? closest.awayTeamId : closest.homeTeamId,
    );
    add(
      "closest_game",
      closest.winnerTeamId,
      `${cWinner?.name} edged ${cLoser?.name} by ${formatPoints(closest.margin)} in week ${closest.week}.`,
      { margin: closest.margin, week: closest.week },
      { week: closest.week, matchupId: closest.id },
    );

    // Upset: the biggest win by a team that finished well below its opponent.
    const upsets = decided
      .map((m) => {
        const winner = history.teamsById.get(m.winnerTeamId!);
        const loserId =
          m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
        const loser = history.teamsById.get(loserId);
        const gap =
          (winner?.regularSeasonRank ?? 0) - (loser?.regularSeasonRank ?? 0);
        return { m, winner, loser, gap };
      })
      .filter((u) => u.gap > 0)
      .sort((a, b) => b.gap - a.gap || b.m.margin - a.m.margin)[0];

    if (upsets) {
      add(
        "biggest_upset",
        upsets.m.winnerTeamId,
        `${upsets.winner?.name} (${ordinalRank(upsets.winner?.regularSeasonRank)}) beat ${upsets.loser?.name} (${ordinalRank(upsets.loser?.regularSeasonRank)}) in week ${upsets.m.week}.`,
        { week: upsets.m.week, seedGap: upsets.gap },
        { week: upsets.m.week, matchupId: upsets.m.id },
      );
    }
  }

  // Streaks
  let bestRun = { length: 0, teamId: "" };
  let worstRun = { length: 0, teamId: "" };
  for (const t of teams) {
    let w = 0;
    let l = 0;
    for (const game of teamGames(history, t.id)) {
      w = game.result === "W" ? w + 1 : 0;
      l = game.result === "L" ? l + 1 : 0;
      if (w > bestRun.length) bestRun = { length: w, teamId: t.id };
      if (l > worstRun.length) worstRun = { length: l, teamId: t.id };
    }
  }
  if (bestRun.teamId) {
    const t = history.teamsById.get(bestRun.teamId);
    add("best_win_streak", bestRun.teamId, `${t?.name} won ${bestRun.length} in a row.`, {
      streak: bestRun.length,
    });
  }
  if (worstRun.teamId) {
    const t = history.teamsById.get(worstRun.teamId);
    add("worst_loss_streak", worstRun.teamId, `${t?.name} lost ${worstRun.length} in a row.`, {
      streak: worstRun.length,
    });
  }

  // Season MVP: most total starter points by a single player.
  const playerTotals = new Map<
    string,
    { playerId: string; name: string; points: number; teamId: string }
  >();
  for (const m of seasonMatchups) {
    for (const [teamId, slots] of m.slotsByTeam) {
      for (const slot of slots) {
        if (!slot.isStarter) continue;
        const entry = playerTotals.get(slot.playerId) ?? {
          playerId: slot.playerId,
          name: slot.playerName,
          points: 0,
          teamId,
        };
        entry.points += slot.points;
        playerTotals.set(slot.playerId, entry);
      }
    }
  }
  const mvp = [...playerTotals.values()].sort((a, b) => b.points - a.points)[0];
  if (mvp) {
    const t = history.teamsById.get(mvp.teamId);
    drafts.push({
      definitionKey: "season_mvp",
      seasonId: season.id,
      week: null,
      userId: t?.userId ?? null,
      fantasyTeamId: mvp.teamId,
      playerId: mvp.playerId,
      matchupId: null,
      titleOverride: `${season.year} MVP — ${mvp.name}`,
      description: `${mvp.name} scored ${formatPoints(mvp.points)} as a starter in ${season.year}.`,
      stats: { points: Math.round(mvp.points * 100) / 100, year: season.year },
      awardedOn,
      isFeatured: false,
      dedupeKey: key("season_mvp"),
    });
  }

  // Waiver hits and misses, scored by what the player did after being added.
  const adds = history.transactions.filter(
    (t) =>
      t.seasonId === season.id &&
      (t.type === "WAIVER_ADD" || t.type === "FREE_AGENT_ADD"),
  );
  const scored = adds
    .map((txn) => {
      const after = seasonMatchups
        .filter((m) => m.week >= (txn.week ?? 1))
        .flatMap((m) => m.slotsByTeam.get(txn.teamId) ?? [])
        .filter((s) => s.playerId === txn.playerId && s.isStarter);
      const points = after.reduce((sum, s) => sum + s.points, 0);
      return { txn, points, games: after.length };
    })
    .filter((entry) => entry.games > 0);

  if (scored.length > 0) {
    const best = [...scored].sort((a, b) => b.points - a.points)[0];
    const bt = history.teamsById.get(best.txn.teamId);
    drafts.push({
      definitionKey: "best_waiver",
      seasonId: season.id,
      week: best.txn.week,
      userId: bt?.userId ?? null,
      fantasyTeamId: best.txn.teamId,
      playerId: best.txn.playerId,
      matchupId: null,
      description: `${bt?.name} added ${best.txn.playerName} in week ${best.txn.week} and got ${formatPoints(best.points)} out of him.`,
      stats: {
        points: Math.round(best.points * 100) / 100,
        faab: best.txn.faabSpent,
        week: best.txn.week,
        year: season.year,
      },
      awardedOn,
      isFeatured: false,
      dedupeKey: key("best_waiver"),
    });

    // Worst pickup is judged on FAAB spent for nothing, not raw low points.
    const paid = scored.filter((s) => (s.txn.faabSpent ?? 0) > 0);
    const pool = paid.length > 0 ? paid : scored;
    const worst = [...pool].sort(
      (a, b) =>
        a.points / Math.max(1, a.txn.faabSpent ?? 1) -
        b.points / Math.max(1, b.txn.faabSpent ?? 1),
    )[0];
    const wt = history.teamsById.get(worst.txn.teamId);
    drafts.push({
      definitionKey: "worst_waiver",
      seasonId: season.id,
      week: worst.txn.week,
      userId: wt?.userId ?? null,
      fantasyTeamId: worst.txn.teamId,
      playerId: worst.txn.playerId,
      matchupId: null,
      description: worst.txn.faabSpent
        ? `${wt?.name} spent $${worst.txn.faabSpent} on ${worst.txn.playerName} for ${formatPoints(worst.points)} points.`
        : `${wt?.name} added ${worst.txn.playerName} and got ${formatPoints(worst.points)} points.`,
      stats: {
        points: Math.round(worst.points * 100) / 100,
        faab: worst.txn.faabSpent,
        week: worst.txn.week,
        year: season.year,
      },
      awardedOn,
      isFeatured: false,
      dedupeKey: key("worst_waiver"),
    });
  }

  // Trades, judged by what each side's incoming players scored afterwards.
  const seasonTrades = history.trades.filter((t) => t.seasonId === season.id);
  const gradedTrades = seasonTrades.map((trade) => {
    const perTeam = new Map<string, number>();
    for (const item of trade.items) {
      if (!item.playerId) continue;
      const points = seasonMatchups
        .filter((m) => m.week >= (trade.week ?? 1))
        .flatMap((m) => m.slotsByTeam.get(item.toTeamId) ?? [])
        .filter((s) => s.playerId === item.playerId && s.isStarter)
        .reduce((sum, s) => sum + s.points, 0);
      perTeam.set(item.toTeamId, (perTeam.get(item.toTeamId) ?? 0) + points);
    }
    const entries = [...perTeam.entries()].sort((a, b) => b[1] - a[1]);
    return { trade, winnerId: entries[0]?.[0], loserId: entries.at(-1)?.[0], entries };
  });

  const decisive = gradedTrades
    .filter((g) => g.entries.length >= 2)
    .sort(
      (a, b) =>
        b.entries[0][1] - b.entries.at(-1)![1] - (a.entries[0][1] - a.entries.at(-1)![1]),
    )[0];

  if (decisive?.winnerId && decisive.loserId) {
    const winnerTeam = history.teamsById.get(decisive.winnerId);
    const loserTeam = history.teamsById.get(decisive.loserId);
    const gained = decisive.entries[0][1];
    const lost = decisive.entries.at(-1)![1];

    add(
      "best_trade",
      decisive.winnerId,
      `${winnerTeam?.name} got ${formatPoints(gained)} out of the trade with ${loserTeam?.name}.`,
      { pointsGained: Math.round(gained * 100) / 100, week: decisive.trade.week },
      { week: decisive.trade.week },
    );
    add(
      "worst_trade",
      decisive.loserId,
      `${loserTeam?.name} got only ${formatPoints(lost)} back from the trade with ${winnerTeam?.name}.`,
      { pointsGained: Math.round(lost * 100) / 100, week: decisive.trade.week },
      { week: decisive.trade.week },
    );
  }

  return drafts;
}

function ordinalRank(rank: number | null | undefined): string {
  if (!rank) return "unseeded";
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

function seasonEnd(year: number): Date {
  return new Date(Date.UTC(year, 11, 28));
}
