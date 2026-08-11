import "dotenv/config";
import { authFromCredentials, buildUrl, fetchLeaguePayload } from "../src/lib/providers/espn/client";

/** Dumps the shape of an ESPN payload so mapping gaps can be diagnosed.
 *    pnpm exec tsx scripts/probe-raw.mts <leagueId> <season> [view,view,…] */
const leagueId = process.argv[2] ?? "1893127963";
const season = Number(process.argv[3] ?? 2025);
const views = (process.argv[4] ?? "mSettings,mTeam,mRoster,mSchedule,mDraftDetail,mStatus,mTransactions2")
  .split(",")
  .filter(Boolean);

const auth = authFromCredentials({
  swid: process.env.ESPN_SWID ?? "",
  espnS2: process.env.ESPN_S2 ?? "",
});

console.log(`views: ${views.join(", ")}`);
console.log(`current-season URL: ${buildUrl(leagueId, season, { historical: false, views })}`);

const { data, usedHistorical } = await fetchLeaguePayload<Record<string, unknown>>(
  leagueId,
  season,
  views,
  auth,
);

console.log(`\nresolved via: ${usedHistorical ? "leagueHistory" : "seasons"} controller`);
console.log(`top-level keys: ${Object.keys(data).join(", ")}`);

const schedule = data.schedule as unknown[] | undefined;
console.log(`\nschedule: ${Array.isArray(schedule) ? `${schedule.length} entries` : "MISSING"}`);
if (Array.isArray(schedule) && schedule.length > 0) {
  console.log("first entry:");
  console.log(JSON.stringify(schedule[0], null, 2).split("\n").slice(0, 30).join("\n"));
}

const txns = data.transactions as unknown[] | undefined;
console.log(`\ntransactions: ${Array.isArray(txns) ? `${txns.length} entries` : "MISSING"}`);

const status = data.status as Record<string, unknown> | undefined;
if (status) {
  console.log(`\nstatus.currentMatchupPeriod=${status.currentMatchupPeriod}`);
  console.log(`status.finalScoringPeriod=${status.finalScoringPeriod}`);
  console.log(`status.latestScoringPeriod=${status.latestScoringPeriod}`);
}
