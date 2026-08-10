import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { renderMemory } from "../src/lib/memories/render";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// A memory with two human subjects on opposite sides, to prove the same row
// renders differently for each of them.
const memory = await db.memory.findFirst({
  where: { template: "matchup_result" },
  orderBy: { importance: "desc" },
  include: { subjects: { include: { user: { select: { id: true, name: true } } } } },
});

if (memory) {
  console.log("=== one row, three viewers ===");
  console.log(`neutral headline: ${memory.headline}\n`);
  for (const subject of memory.subjects) {
    if (!subject.user) continue;
    const view = renderMemory(memory, subject.user.id);
    console.log(`as ${subject.user.name.padEnd(20)} ${view.text}`);
  }
  const stranger = renderMemory(memory, "someone-else");
  console.log(`as ${"a stranger".padEnd(20)} ${stranger.text}`);
}

const hunter = await db.user.findUniqueOrThrow({
  where: { email: "hunter@sflinsider.com" },
  select: { id: true, name: true },
});

const mine = await db.memory.findMany({
  where: { subjects: { some: { userId: hunter.id } } },
  orderBy: [{ importance: "desc" }, { occurredOn: "desc" }],
  take: 12,
});

console.log(`\n=== top memories for ${hunter.name} (${mine.length} shown) ===`);
for (const m of mine) {
  const view = renderMemory(m, hunter.id);
  console.log(`[${String(m.importance).padStart(3)}] ${m.type.padEnd(19)} ${view.text}`);
  if (view.detail) console.log(`      ${view.detail}`);
}

const records = await db.leagueRecord.findMany({
  where: { isCurrent: true, league: { slug: "the-founders-league" } },
  orderBy: [{ category: "asc" }, { key: "asc" }],
});
console.log("\n=== current records, The Founders League ===");
for (const r of records) {
  console.log(`${r.category.padEnd(8)} ${r.label.padEnd(30)} ${r.displayValue.padEnd(12)} ${r.description}`);
}

const certificates = await db.certificate.findMany({ take: 4, orderBy: { issuedOn: "desc" } });
console.log("\n=== sample certificates ===");
for (const c of certificates) {
  console.log(`${c.serialNumber}  ${c.title.padEnd(28)} ${c.recipientName.padEnd(20)} ${c.seasonLabel}`);
}

await db.$disconnect();
