import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Marks past seasons COMPLETE. Repairs rows imported before the provider
 *  stopped trusting ESPN's `isActive` flag. */
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const result = await db.season.updateMany({
  where: { year: { lt: new Date().getFullYear() }, status: { not: "COMPLETE" } },
  data: { status: "COMPLETE" },
});

console.log(`Marked ${result.count} past season(s) COMPLETE.`);
await db.$disconnect();
