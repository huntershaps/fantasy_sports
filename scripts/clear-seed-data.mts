import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Removes the generated demo leagues and the accounts invented for them.
 *
 * Scoped deliberately: only the two seeded slugs, and only users on the seed's
 * @example.com domain who hold no remaining team. Real managers (imported from
 * ESPN, on @unclaimed.invalid) and any genuine account are left alone.
 */
const SEED_SLUGS = ["the-founders-league", "sunday-scaries"];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

for (const slug of SEED_SLUGS) {
  const league = await db.league.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!league) {
    console.log(`  ${slug}: not present`);
    continue;
  }
  // Seasons and teams point at each other, so break the cycle before deleting.
  await db.season.updateMany({
    where: { leagueId: league.id },
    data: { championTeamId: null, runnerUpTeamId: null },
  });
  await db.league.delete({ where: { id: league.id } });
  console.log(`  deleted "${league.name}"`);
}

const orphans = await db.user.findMany({
  where: {
    email: { endsWith: "@example.com" },
    teamMemberships: { none: {} },
  },
  select: { id: true, name: true },
});

if (orphans.length > 0) {
  await db.user.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
  console.log(`  removed ${orphans.length} seeded accounts`);
}

const remaining = await db.league.findMany({
  select: { name: true, slug: true, _count: { select: { seasons: true } } },
});
console.log("\nLeagues remaining:");
for (const l of remaining) {
  console.log(`  ${l.name} (/${l.slug}) — ${l._count.seasons} seasons`);
}
console.log(`Players: ${await db.player.count()}   Users: ${await db.user.count()}`);

await db.$disconnect();
