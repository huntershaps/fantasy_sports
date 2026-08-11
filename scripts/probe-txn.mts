import "dotenv/config";

/** Tries several documented shapes for pulling ESPN transactions, so we can
 *  see which (if any) actually returns a `transactions` branch.
 *    pnpm exec tsx scripts/probe-txn.mts <leagueId> <season> <scoringPeriod> */
const leagueId = process.argv[2] ?? "1893127963";
const season = Number(process.argv[3] ?? 2025);
const period = Number(process.argv[4] ?? 5);

const swid = (process.env.ESPN_SWID ?? "").trim();
const s2 = (process.env.ESPN_S2 ?? "").trim();
const cookie = `SWID=${swid.startsWith("{") ? swid : `{${swid}}`}; espn_s2=${s2}`;
const HOST = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

const attempts: { label: string; url: string; filter?: unknown }[] = [
  {
    label: "mTransactions2 + filter + scoringPeriodId",
    url: `${HOST}/seasons/${season}/segments/0/leagues/${leagueId}?view=mTransactions2&scoringPeriodId=${period}`,
    filter: { transactions: { filterType: { value: ["WAIVER", "TRADE", "FREEAGENT"] } } },
  },
  {
    label: "mTransactions2 + filter, no scoringPeriodId",
    url: `${HOST}/seasons/${season}/segments/0/leagues/${leagueId}?view=mTransactions2`,
    filter: { transactions: { filterType: { value: ["WAIVER", "TRADE", "FREEAGENT"] } } },
  },
  {
    label: "communication/transactions endpoint",
    url: `${HOST}/seasons/${season}/segments/0/leagues/${leagueId}/transactions?scoringPeriodId=${period}`,
  },
  {
    label: "mRecentActivity + filter",
    url: `${HOST}/seasons/${season}/segments/0/leagues/${leagueId}?view=mRecentActivity`,
    filter: {
      topics: {
        filterType: { value: ["ACTIVITY_TRANSACTIONS"] },
        limit: 25,
        sortMessageDate: { sortPriority: 1, sortAsc: false },
      },
    },
  },
  {
    // What espn-api's recent_activity actually does: the league endpoint with
    // the communication view, and the full topics filter it sends.
    label: "kona_league_communication on league endpoint",
    url: `${HOST}/seasons/${season}/segments/0/leagues/${leagueId}?view=kona_league_communication`,
    filter: {
      topics: {
        filterType: { value: ["ACTIVITY_TRANSACTIONS"] },
        limit: 25,
        limitPerMessageSet: { value: 25 },
        offset: 0,
        sortMessageDate: { sortPriority: 1, sortAsc: false },
        sortFor: { sortPriority: 2, sortAsc: false },
        filterIncludeMessageTypeIds: {
          value: [178, 180, 179, 239, 181, 244, 188, 198, 197],
        },
      },
    },
  },
];

for (const attempt of attempts) {
  try {
    const response = await fetch(attempt.url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
        cookie,
        ...(attempt.filter ? { "x-fantasy-filter": JSON.stringify(attempt.filter) } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.log(`${attempt.label}\n  HTTP ${response.status}\n`);
      continue;
    }

    const json = (await response.json()) as Record<string, unknown>;
    const body = Array.isArray(json) ? (json[0] as Record<string, unknown>) : json;
    const keys = Object.keys(body ?? {});
    const txns = body?.transactions as unknown[] | undefined;
    const topics = body?.topics as unknown[] | undefined;

    console.log(attempt.label);
    console.log(`  keys: ${keys.join(", ") || "(none)"}`);
    console.log(`  transactions: ${Array.isArray(txns) ? txns.length : "absent"}`);
    console.log(`  topics: ${Array.isArray(topics) ? topics.length : "absent"}`);
    if (Array.isArray(txns) && txns.length > 0) {
      console.log(`  sample: ${JSON.stringify(txns[0]).slice(0, 320)}`);
    }
    if (Array.isArray(topics) && topics.length > 0) {
      console.log(`  sample: ${JSON.stringify(topics[0]).slice(0, 320)}`);
    }
    console.log();
  } catch (error) {
    console.log(`${attempt.label}\n  ERROR ${error instanceof Error ? error.message : error}\n`);
  }
}
