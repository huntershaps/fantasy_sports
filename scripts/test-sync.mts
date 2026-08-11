import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptJson } from "../src/lib/crypto";
import { runSync } from "../src/lib/sync/run";

/**
 * End-to-end sync against a real ESPN league.
 *   pnpm exec tsx scripts/test-sync.mts <leagueId> <season>
 * Credentials come from ESPN_SWID / ESPN_S2 in .env, never the command line.
 */
const providerLeagueId = process.argv[2] ?? "1893127963";
const season = Number(process.argv[3] ?? new Date().getFullYear());

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const slug = `espn-${providerLeagueId}`;

const league = await db.league.upsert({
  where: { slug },
  create: {
    slug,
    name: "Imported ESPN League",
    foundedYear: season,
    provider: "ESPN",
    accentColor: "#2D8CFF",
    secondColor: "#F59E0B",
  },
  update: { provider: "ESPN" },
});

await db.providerCredential.upsert({
  where: { leagueId: league.id },
  create: {
    leagueId: league.id,
    provider: "ESPN",
    providerLeagueId,
    encryptedData: encryptJson({
      swid: process.env.ESPN_SWID ?? "",
      espnS2: process.env.ESPN_S2 ?? "",
    }),
  },
  update: {
    providerLeagueId,
    encryptedData: encryptJson({
      swid: process.env.ESPN_SWID ?? "",
      espnS2: process.env.ESPN_S2 ?? "",
    }),
  },
});

console.log(`Syncing ESPN league ${providerLeagueId}, season ${season}…\n`);
const outcome = await runSync(db, {
  leagueId: league.id,
  seasons: [season],
  mode: "FULL",
});

console.log(`status:   ${outcome.status}`);
console.log(`seasons:  ${outcome.seasonsImported.join(", ") || "none"}`);
console.log(`created:  ${outcome.created}`);
console.log(`updated:  ${outcome.updated}`);
if (outcome.errors.length) {
  console.log("errors:");
  for (const e of outcome.errors) console.log(`  ${e.entity}: ${e.message}`);
}

const stored = await db.league.findUniqueOrThrow({
  where: { id: league.id },
  include: {
    settings: true,
    seasons: {
      include: {
        teams: { orderBy: { providerTeamId: "asc" } },
        _count: { select: { matchups: true, draftPicks: true, transactions: true } },
      },
    },
  },
});

console.log(`\nStored league: ${stored.name}`);
console.log(
  `  settings: ${stored.settings?.teamCount} teams, ${stored.settings?.regularSeasonWeeks} reg weeks, ` +
    `${stored.settings?.playoffTeamCount} playoff teams, ${stored.settings?.scoringType}`,
);
for (const s of stored.seasons) {
  console.log(
    `  ${s.year}: ${s.teams.length} teams, ${s._count.matchups} matchups, ` +
      `${s._count.draftPicks} picks, ${s._count.transactions} transactions (week ${s.currentWeek})`,
  );
  for (const t of s.teams.slice(0, 4)) {
    console.log(`     ${t.providerTeamId?.padStart(2)} ${t.name}`);
  }
}

// Idempotence: a second run must not duplicate anything.
console.log("\nRunning again to prove idempotence…");
const second = await runSync(db, { leagueId: league.id, seasons: [season], mode: "FULL" });
const after = await db.fantasyTeam.count({ where: { season: { leagueId: league.id } } });
console.log(`  status=${second.status} created=${second.created} updated=${second.updated}`);
console.log(`  fantasy teams after two runs: ${after}`);

await db.$disconnect();
