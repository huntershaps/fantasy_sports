import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Deletes players nothing references any more — left behind when a league is
 *  removed. Safe to run at any time; a player still on a roster, in a
 *  transaction or on a draft board is never touched. */
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const result = await db.player.deleteMany({
  where: {
    lineupSlots: { none: {} },
    transactions: { none: {} },
    draftPicks: { none: {} },
    tradeItems: { none: {} },
    awards: { none: {} },
    heldRecords: { none: {} },
  },
});

console.log(`Pruned ${result.count} unreferenced players.`);
console.log(`Players remaining: ${await db.player.count()}`);
await db.$disconnect();
