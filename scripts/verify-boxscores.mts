import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Checks that stored box scores reconcile with the scores they belong to.
 *
 * A team's starters must add up to the score recorded for that team. If they
 * do not, the import lost or misfiled somebody, and every derived number —
 * records, awards, "points left on the bench" — inherits the error.
 *
 * This exists because that invariant was broken and nothing noticed: the ESPN
 * importer preferred whichever roster branch was longer, which was the *current*
 * roster, so any player dropped later in the season vanished from the week they
 * actually played.
 *
 *   pnpm exec tsx scripts/verify-boxscores.mts [leagueSlug]
 *
 * Exits non-zero if anything fails to reconcile, so it can gate a sync.
 */
const leagueSlug = process.argv[2];
const TOLERANCE = 0.5; // scoring settings round; half a point is noise, not loss

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const matchups = await db.matchup.findMany({
  where: {
    isComplete: true,
    players: { some: {} },
    ...(leagueSlug ? { season: { league: { slug: leagueSlug } } } : {}),
  },
  select: {
    week: true,
    homeScore: true,
    awayScore: true,
    homeTeamId: true,
    awayTeamId: true,
    homeTeam: { select: { name: true } },
    awayTeam: { select: { name: true } },
    season: { select: { year: true, league: { select: { name: true } } } },
    players: { select: { fantasyTeamId: true, isStarter: true, points: true, slot: true } },
  },
  orderBy: [{ week: "asc" }],
});

type Failure = { where: string; team: string; recorded: number; summed: number; slots: string };
const failures: Failure[] = [];
let checked = 0;

for (const m of matchups) {
  for (const side of [
    { id: m.homeTeamId, name: m.homeTeam.name, recorded: Number(m.homeScore) },
    { id: m.awayTeamId, name: m.awayTeam.name, recorded: Number(m.awayScore) },
  ]) {
    const rows = m.players.filter((p) => p.fantasyTeamId === side.id);
    if (rows.length === 0) continue;
    checked++;

    const summed = rows
      .filter((p) => p.isStarter)
      .reduce((total, p) => total + Number(p.points), 0);

    if (Math.abs(summed - side.recorded) > TOLERANCE) {
      failures.push({
        where: `${m.season.year} wk${String(m.week).padStart(2)}`,
        team: side.name,
        recorded: side.recorded,
        summed,
        slots: [...new Set(rows.filter((p) => p.isStarter).map((p) => p.slot))].sort().join(","),
      });
    }
  }
}

console.log(`Team-weeks with a stored box score: ${checked}`);
console.log(`Reconciling with the recorded score: ${checked - failures.length}`);
console.log(`Not reconciling: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nStarters do not add up to the recorded score:\n");
  for (const f of failures.slice(0, 25)) {
    const gap = f.recorded - f.summed;
    console.log(
      `  ${f.where}  ${f.team.slice(0, 26).padEnd(26)} recorded ${f.recorded.toFixed(2).padStart(7)}` +
        `  starters ${f.summed.toFixed(2).padStart(7)}  short ${gap.toFixed(2).padStart(7)}  [${f.slots}]`,
    );
  }
  if (failures.length > 25) console.log(`  … and ${failures.length - 25} more`);

  const short = failures.filter((f) => f.recorded > f.summed).length;
  const over = failures.length - short;

  if (short > 0) {
    console.log(
      `\n${short} are SHORT — starters are missing. That is ours: re-run the` +
        ` sync with box scores to rebuild them from ESPN.`,
    );
  }
  if (over > 0) {
    console.log(
      `\n${over} are OVER — the roster ESPN returns adds up to more than the` +
        ` score ESPN records for the same team. Re-syncing will not change it;` +
        ` the two disagree at the source. Seen on abandoned teams, where a` +
        ` scoring correction lands on the total but not on the box score.`,
    );
  }
}

await db.$disconnect();
process.exit(failures.length > 0 ? 1 : 0);
