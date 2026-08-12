import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { rebuildAllLeagues, rebuildLeagueDerivedData } from "../src/lib/engine/rebuild";

/** Recomputes records, awards and memories.
 *    pnpm exec tsx scripts/rebuild.mts [leagueSlug] */
const slug = process.argv[2];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const summaries = slug
  ? [
      await rebuildLeagueDerivedData(
        db,
        (await db.league.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id,
      ),
    ]
  : await rebuildAllLeagues(db);

for (const s of summaries) {
  console.log(
    `${s.leagueName}: ${s.currentRecords} records, ${s.awards} awards, ` +
      `${s.certificates} certificates, ${s.memories} memories (${s.durationMs}ms)`,
  );
}

await db.$disconnect();
