import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Deletes a league and everything hanging off it.
 *    pnpm exec tsx scripts/remove-league.mts <slug> */
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: tsx scripts/remove-league.mts <slug>");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const league = await db.league.findUnique({ where: { slug }, select: { id: true, name: true } });
if (!league) {
  console.log(`No league with slug "${slug}".`);
} else {
  // Seasons and teams reference each other, so break the cycle first.
  await db.season.updateMany({
    where: { leagueId: league.id },
    data: { championTeamId: null, runnerUpTeamId: null },
  });
  await db.league.delete({ where: { id: league.id } });
  console.log(`Deleted "${league.name}" and all of its data.`);
}

await db.$disconnect();
