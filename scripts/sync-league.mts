import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runSync } from "../src/lib/sync/run";

/**
 * Sync connected leagues from their provider. This is what the scheduled
 * GitHub Actions workflow runs, and it works by hand too:
 *
 *   pnpm exec tsx scripts/sync-league.mts                     # every connected league, current season
 *   pnpm exec tsx scripts/sync-league.mts --season 2025
 *   pnpm exec tsx scripts/sync-league.mts --slug the-aussie-grillers
 *   pnpm exec tsx scripts/sync-league.mts --no-box-scores
 *
 * It talks to the database directly rather than through an HTTP endpoint, so
 * there is no public sync route to secure and no serverless execution limit to
 * design around — an in-season sync with a full slate of box scores can take
 * far longer than a scheduled function is allowed to run.
 *
 * Exits non-zero if any league fails, so a failed run shows up red in Actions
 * instead of passing silently.
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/**
 * The NFL season is named for the year it starts, but runs into February. In
 * January and February the season people care about is still last year's, so
 * `new Date().getFullYear()` would ask the provider for a season that has not
 * begun and quietly sync nothing.
 */
function currentSeasonYear(now = new Date()): number {
  return now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear();
}

const season = Number(arg("season") ?? currentSeasonYear());
const slug = arg("slug");
const withBoxScores = !flag("no-box-scores");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const leagues = await db.league.findMany({
  where: {
    ...(slug ? { slug } : {}),
    isArchived: false,
    providerCredential: { isNot: null },
  },
  select: {
    id: true,
    name: true,
    slug: true,
    providerCredential: { select: { providerLeagueId: true } },
  },
  orderBy: { name: "asc" },
});

if (leagues.length === 0) {
  // Not an error worth failing the job over on its own, but it is almost
  // always a misconfiguration rather than a genuinely empty archive — a league
  // whose credential was cleared silently stops syncing and looks fine.
  console.error(
    slug
      ? `No connected league matches slug "${slug}". Connect it under /admin/sync first.`
      : "No league has a provider credential. Connect one under /admin/sync first.",
  );
  await db.$disconnect();
  process.exit(1);
}

console.log(`Syncing ${leagues.length} league(s), season ${season}, boxScores=${withBoxScores}\n`);

let failed = 0;

for (const league of leagues) {
  if (!league.providerCredential?.providerLeagueId) {
    console.error(`✗ ${league.name}: connected but has no provider league id.`);
    failed += 1;
    continue;
  }

  const startedAt = Date.now();
  try {
    const outcome = await runSync(db, {
      leagueId: league.id,
      seasons: [season],
      mode: "INCREMENTAL",
      withBoxScores,
    });
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    const mark = outcome.status === "SUCCESS" ? "✓" : outcome.status === "PARTIAL" ? "!" : "✗";
    console.log(
      `${mark} ${league.name}: ${outcome.status} in ${seconds}s — ` +
        `created ${outcome.created}, updated ${outcome.updated}, ` +
        `seasons [${outcome.seasonsImported.join(", ") || "none"}]`,
    );
    for (const error of outcome.errors) {
      console.error(`    ${error.entity}: ${error.message}`);
    }
    if (outcome.status === "FAILED") failed += 1;
  } catch (error) {
    console.error(
      `✗ ${league.name}: threw after ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ` +
        (error instanceof Error ? error.message : String(error)),
    );
    failed += 1;
  }
}

await db.$disconnect();

if (failed > 0) {
  console.error(`\n${failed} league(s) failed.`);
  process.exit(1);
}
console.log("\nAll leagues synced.");
