import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Removes stored lineups from matchups that have not been played.
 *
 * ESPN returns a roster for an upcoming matchup — the roster as it stands
 * today, not a lineup anyone submitted for that game. Storing it against the
 * matchup made an unplayed week render as a full lineup where every player
 * scored 0.00, which looks exactly like invented data.
 *
 * The importer no longer does this. This clears what earlier imports left
 * behind. It only ever touches rows attached to `isComplete: false` matchups,
 * so no played result can be lost.
 *
 *   pnpm exec tsx scripts/clear-unplayed-lineups.mts          # dry run
 *   pnpm exec tsx scripts/clear-unplayed-lineups.mts --apply  # delete
 */
const apply = process.argv.includes("--apply");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const affected = await db.matchup.findMany({
  where: { isComplete: false, players: { some: {} } },
  select: {
    week: true,
    homeScore: true,
    awayScore: true,
    season: { select: { year: true, league: { select: { name: true } } } },
    _count: { select: { players: true } },
  },
  orderBy: [{ week: "asc" }],
});

if (affected.length === 0) {
  console.log("No unplayed matchup is carrying a lineup. Nothing to do.");
} else {
  const rows = affected.reduce((total, m) => total + m._count.players, 0);
  console.log(`${affected.length} unplayed matchups carry ${rows} lineup rows:\n`);

  const bySeason = new Map<string, { matchups: number; rows: number }>();
  for (const m of affected) {
    const key = `${m.season.league.name} ${m.season.year}`;
    const entry = bySeason.get(key) ?? { matchups: 0, rows: 0 };
    entry.matchups++;
    entry.rows += m._count.players;
    bySeason.set(key, entry);
  }
  for (const [season, counts] of bySeason) {
    console.log(`  ${season}: ${counts.matchups} matchups, ${counts.rows} player rows`);
  }

  // Guard: refuse to touch anything carrying a score, whatever isComplete says.
  const scored = affected.filter(
    (m) => Number(m.homeScore) !== 0 || Number(m.awayScore) !== 0,
  );
  if (scored.length > 0) {
    console.error(
      `\nRefusing to run: ${scored.length} of these have a non-zero score, so they may` +
        ` have been played despite isComplete being false. Investigate before deleting.`,
    );
    await db.$disconnect();
    process.exit(1);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete these lineup rows.");
  } else {
    const result = await db.matchupPlayer.deleteMany({
      where: { matchup: { isComplete: false } },
    });
    console.log(`\nDeleted ${result.count} lineup rows from unplayed matchups.`);
  }
}

await db.$disconnect();
