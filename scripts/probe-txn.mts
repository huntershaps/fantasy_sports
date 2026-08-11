import "dotenv/config";

/** Tests transaction endpoints across both ESPN hosts.
 *    pnpm exec tsx scripts/probe-txn.mts <leagueId> <season> <scoringPeriod> */
const leagueId = process.argv[2] ?? "1893127963";
const season = Number(process.argv[3] ?? 2025);
const period = Number(process.argv[4] ?? 5);

const swid = (process.env.ESPN_SWID ?? "").trim();
const s2 = (process.env.ESPN_S2 ?? "").trim();
const cookie = `SWID=${swid.startsWith("{") ? swid : `{${swid}}`}; espn_s2=${s2}`;

const HOSTS = {
  reads: "https://lm-api-reads.fantasy.espn.com",
  www: "https://fantasy.espn.com",
};

const TXN_FILTER = {
  transactions: { filterType: { value: ["WAIVER", "TRADE", "ADD", "DROP"] } },
};

const COMMS_FILTER = {
  topics: {
    filterType: { value: ["ACTIVITY_TRANSACTIONS"] },
    limit: 50,
    sortMessageDate: { sortPriority: 1, sortAsc: false },
  },
};

type Attempt = { label: string; url: string; filter: unknown };
const attempts: Attempt[] = [];

for (const [hostName, host] of Object.entries(HOSTS)) {
  const league = `${host}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`;
  attempts.push({
    label: `${hostName}: mTransactions2 + period ${period}`,
    url: `${league}?view=mTransactions2&scoringPeriodId=${period}`,
    filter: TXN_FILTER,
  });
  attempts.push({
    label: `${hostName}: kona_league_communication`,
    url: `${league}?view=kona_league_communication`,
    filter: COMMS_FILTER,
  });
}

for (const attempt of attempts) {
  try {
    const response = await fetch(attempt.url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        cookie,
        "x-fantasy-filter": JSON.stringify(attempt.filter),
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`${attempt.label}\n  HTTP ${response.status}\n`);
      continue;
    }

    const text = await response.text();
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(text);
      body = (Array.isArray(parsed) ? parsed[0] : parsed) ?? {};
    } catch {
      console.log(`${attempt.label}\n  non-JSON (${text.length} bytes)\n`);
      continue;
    }

    const txns = body.transactions as unknown[] | undefined;
    const topics = body.topics as unknown[] | undefined;
    console.log(attempt.label);
    console.log(`  keys: ${Object.keys(body).join(", ").slice(0, 120) || "(none)"}`);
    console.log(`  transactions: ${Array.isArray(txns) ? txns.length : "absent"}`);
    console.log(`  topics: ${Array.isArray(topics) ? topics.length : "absent"}`);
    const sample = (Array.isArray(txns) && txns[0]) || (Array.isArray(topics) && topics[0]);
    if (sample) console.log(`  sample: ${JSON.stringify(sample).slice(0, 400)}`);
    console.log();
  } catch (error) {
    console.log(
      `${attempt.label}\n  ERROR ${error instanceof Error ? error.message : error}\n`,
    );
  }
}
