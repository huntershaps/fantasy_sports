import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { MemoryType } from "../src/generated/prisma/enums";

/**
 * Writes a hand-authored memory.
 *
 * The engine can only derive what the data records. It cannot know that someone
 * drafted a star and then abandoned the league — that is league lore, and lore
 * is most of what makes an archive worth reading. These are stored with
 * source MANUAL, which the rebuild deliberately never touches.
 *
 *   pnpm exec tsx scripts/add-memory.mts <leagueSlug> <year> <type> <headline> [body]
 */
const [slug, yearArg, typeArg, headline, body] = process.argv.slice(2);
if (!slug || !yearArg || !typeArg || !headline) {
  console.error(
    'Usage: tsx scripts/add-memory.mts <leagueSlug> <year> <type> "<headline>" ["<body>"]',
  );
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const league = await db.league.findUniqueOrThrow({
  where: { slug },
  select: { id: true, name: true },
});

const season = await db.season.findUnique({
  where: { leagueId_year: { leagueId: league.id, year: Number(yearArg) } },
  select: { id: true, year: true, startDate: true },
});

const memory = await db.memory.create({
  data: {
    id: randomUUID(),
    leagueId: league.id,
    seasonId: season?.id ?? null,
    type: typeArg as MemoryType,
    // Dated to the season's draft window when no better date is known, so it
    // sorts into the right year rather than to whenever it was written.
    occurredOn: season ? new Date(Date.UTC(season.year, 7, 26)) : new Date(),
    template: "custom",
    data: {},
    headline,
    body: body ?? null,
    importance: 75,
    isFeatured: false,
    source: "MANUAL",
    dedupeKey: `manual:${league.id}:${headline.slice(0, 60)}`,
  },
  select: { id: true, headline: true },
});

console.log(`Added to “${league.name}” (${yearArg}):`);
console.log(`  ${memory.headline}`);
console.log(`  id ${memory.id} — survives every rebuild.`);

await db.$disconnect();
