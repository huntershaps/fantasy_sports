import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptJson } from "../src/lib/crypto";
import { runSync } from "../src/lib/sync/run";

/**
 * One-shot import that does not leave the credential behind.
 *
 * Stores the ESPN cookies just long enough for the sync to read them, then
 * deletes the ProviderCredential row. Useful when a cookie has been exposed and
 * needs rotating — you still get the data without persisting a bad secret.
 *
 *   pnpm exec tsx scripts/import-once.mts <slug> <providerLeagueId> <seasons…>
 */
const [slug, providerLeagueId, ...seasonArgs] = process.argv.slice(2);
if (!slug || !providerLeagueId) {
  console.error("Usage: tsx scripts/import-once.mts <slug> <leagueId> <season…>");
  process.exit(1);
}
const seasons = seasonArgs.map(Number).filter(Number.isInteger);

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const league = await db.league.findUniqueOrThrow({
  where: { slug },
  select: { id: true, name: true },
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

console.log(`Importing ${seasons.join(", ")} into “${league.name}”…\n`);

try {
  const outcome = await runSync(db, {
    leagueId: league.id,
    seasons,
    mode: "HISTORICAL",
    withBoxScores: true,
  });
  console.log(`status:  ${outcome.status}`);
  console.log(`seasons: ${outcome.seasonsImported.join(", ")}`);
  console.log(`created: ${outcome.created}   updated: ${outcome.updated}`);
  for (const e of outcome.errors) console.log(`  ! ${e.entity}: ${e.message}`);
} finally {
  // Always remove the credential, even if the sync threw.
  await db.providerCredential.deleteMany({ where: { leagueId: league.id } });
  console.log("\nStored credential deleted.");
}

const season = await db.season.findMany({
  where: { leagueId: league.id },
  orderBy: { year: "desc" },
  include: {
    _count: { select: { matchups: true, teams: true, draftPicks: true } },
    champion: { select: { name: true } },
  },
});
for (const s of season) {
  console.log(
    `  ${s.year}: ${s._count.teams} teams, ${s._count.matchups} matchups, ` +
      `${s._count.draftPicks} picks, champion=${s.champion?.name ?? "—"}`,
  );
}

const slots = await db.matchupPlayer.count({
  where: { matchup: { season: { leagueId: league.id } } },
});
console.log(`  lineup slots: ${slots}`);

await db.$disconnect();
