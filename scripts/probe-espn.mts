import "dotenv/config";
import { espnProvider } from "../src/lib/providers/espn";

/**
 * Runs the ESPN provider against a real league and prints what came back.
 *   pnpm exec tsx scripts/probe-espn.mts <leagueId> <season>
 * Credentials are read from ESPN_SWID / ESPN_S2 in .env — never pass them on
 * the command line, where they would land in shell history.
 */
const leagueId = process.argv[2] ?? "1893127963";
const season = Number(process.argv[3] ?? new Date().getFullYear());

const ctx = {
  providerLeagueId: leagueId,
  credentials: {
    swid: process.env.ESPN_SWID ?? "",
    espnS2: process.env.ESPN_S2 ?? "",
  },
};

const hasCreds = Boolean(ctx.credentials.swid && ctx.credentials.espnS2);
console.log(`League ${leagueId}, season ${season}, cookies: ${hasCreds ? "yes" : "no"}\n`);

const check = await espnProvider.checkConnection(ctx, season);
console.log("checkConnection:");
console.log(`  ok=${check.ok} requiresCredentials=${check.requiresCredentials}`);
console.log(`  ${check.message}`);
if (check.seasons) console.log(`  seasons: ${check.seasons.join(", ")}`);

if (!check.ok) process.exit(0);

const withBoxScores = process.argv.includes("--box");
if (withBoxScores) console.log("\n(fetching box scores — one request per played week)");
const data = await espnProvider.fetchSeason(ctx, season, { withBoxScores });

console.log(`\nleague: ${data.league.name}`);
console.log(
  `  teams=${data.league.teamCount} regWeeks=${data.league.regularSeasonWeeks} ` +
    `playoffWeeks=${data.league.playoffWeeks} playoffTeams=${data.league.playoffTeamCount} ` +
    `currentWeek=${data.league.currentWeek} scoring=${data.league.scoringType}`,
);

console.log(`\nmembers (${data.members.length}):`);
for (const m of data.members.slice(0, 4)) {
  console.log(`  ${m.providerMemberId} ${m.displayName}${m.isLeagueManager ? " (LM)" : ""}`);
}

console.log(`\nteams (${data.teams.length}):`);
for (const t of data.teams) {
  console.log(
    `  ${t.providerTeamId.padStart(2)} ${t.name.padEnd(26)} ` +
      `${t.wins}-${t.losses}-${t.ties} PF ${t.pointsFor} owners=${t.ownerIds.length}`,
  );
}

console.log(`\nmatchups (${data.matchups.length}):`);
const weeks = [...new Set(data.matchups.map((m) => m.week))].sort((a, b) => a - b);
for (const week of weeks) {
  const games = data.matchups.filter((m) => m.week === week);
  const done = games.filter((m) => m.isComplete);
  const scored = games.filter((m) => m.homeScore > 0 || m.awayScore > 0);
  console.log(
    `  wk${String(week).padStart(2)}  ${games.length} games, ${done.length} complete, ${scored.length} scored` +
      (games[0] ? `  [${games[0].type}]` : ""),
  );
}
console.log("\n  sample completed games:");
for (const m of data.matchups.filter((m) => m.isComplete).slice(0, 5)) {
  console.log(
    `    wk${String(m.week).padStart(2)} ${m.type.padEnd(13)} ` +
      `${m.homeProviderTeamId} ${m.homeScore} - ${m.awayScore} ${m.awayProviderTeamId} ` +
      `winner=${m.winner ?? "-"} lineup=${m.homeLineup.length}/${m.awayLineup.length}`,
  );
}

console.log(`\nplayers: ${data.players.length}`);
for (const p of data.players.slice(0, 5)) {
  console.log(`  ${p.providerPlayerId.padStart(7)} ${p.fullName} (${p.position}, ${p.nflTeam})`);
}
console.log(`draftPicks: ${data.draftPicks.length}`);
console.log(`transactions: ${data.transactions.length}`);
