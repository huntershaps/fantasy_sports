import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assetIdFromRef } from "../src/lib/images";

/**
 * Push crests from one database to another — the uploaded image bytes, plus
 * the logo columns on leagues, franchises and teams.
 *
 *   pnpm exec tsx scripts/push-logos.mts --prod            # dry run against production
 *   pnpm exec tsx scripts/push-logos.mts --prod --apply    # write
 *   SOURCE_URL=... TARGET_URL=... pnpm exec tsx scripts/push-logos.mts
 *
 * Why not scripts/copy-db.mts: that inserts with skipDuplicates, so it can
 * only populate an empty target. Here every row that needs to change already
 * exists on the target with the same id, so inserting would skip all of them
 * and the logos would silently never arrive. This updates in place instead.
 *
 * Matching is strictly on primary key, which holds because the target was
 * originally seeded from this same source. If the ids ever diverge this
 * reports the misses and exits non-zero rather than guessing at a mapping.
 *
 * Only logo columns are touched. Memories, awards, records, matchups, seasons
 * and users on the target are never written.
 */
const apply = process.argv.includes("--apply");

/**
 * --prod fills TARGET_URL from .env.production.local, so the production
 * connection string never has to be pasted onto a command line or into shell
 * history. It is an explicit flag rather than a fallback precisely because
 * silently defaulting to production is how a dry run becomes an accident.
 */
const useProd = process.argv.includes("--prod");

function productionUrl(): string {
  const file = readFileSync(".env.production.local", "utf8");
  const marker = "DATABASE_URL=";
  const line = file
    .split(String.fromCharCode(10))
    .map((l) => l.trim())
    .find((l) => l.startsWith(marker));
  const value = line?.slice(marker.length).trim().replace(/^"|"$/g, "");
  if (!value) throw new Error("No DATABASE_URL in .env.production.local");
  return value;
}

const sourceUrl = process.env.SOURCE_URL ?? process.env.DATABASE_URL;
const targetUrl = useProd ? productionUrl() : process.env.TARGET_URL;

if (!sourceUrl || !targetUrl) {
  console.error("Set SOURCE_URL and TARGET_URL (or pass --prod for the target).");
  process.exit(1);
}
if (sourceUrl === targetUrl) {
  console.error("SOURCE_URL and TARGET_URL are the same database.");
  process.exit(1);
}

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: sourceUrl }) });
const target = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });

let missing = 0;

try {
  console.log(apply ? "Applying.\n" : "Dry run — nothing will be written.\n");

  // 1. Image bytes first. A logoUrl of "asset:<id>" is a dangling reference
  //    until the row it names exists, so these must land before anything
  //    points at them.
  const assets = await source.imageAsset.findMany();
  let assetsWritten = 0;
  for (const asset of assets) {
    const already = await target.imageAsset.findUnique({
      where: { id: asset.id },
      select: { id: true },
    });
    if (already) continue;
    if (apply) {
      // uploadedById is nulled deliberately: the uploader exists on both sides
      // today, but a crest is not worth failing the push over if that stops
      // being true.
      await target.imageAsset.create({ data: { ...asset, uploadedById: null } });
    }
    assetsWritten += 1;
  }
  console.log(`images:     ${assetsWritten} of ${assets.length} to write`);

  // 2. Teams — logoUrl, providerLogoUrl, and the lockedFields pin that stops a
  //    sync undoing it. All three together, or the logo arrives unprotected.
  const teams = await source.fantasyTeam.findMany({
    select: { id: true, name: true, logoUrl: true, providerLogoUrl: true, lockedFields: true },
  });
  let teamsWritten = 0;
  for (const team of teams) {
    const current = await target.fantasyTeam.findUnique({
      where: { id: team.id },
      select: { logoUrl: true, lockedFields: true },
    });
    if (!current) {
      console.warn(`  ! no target row for team ${team.name} (${team.id})`);
      missing += 1;
      continue;
    }
    const sameLogo = current.logoUrl === team.logoUrl;
    const sameLock =
      current.lockedFields.includes("logoUrl") === team.lockedFields.includes("logoUrl");
    if (sameLogo && sameLock) continue;

    if (apply) {
      await target.fantasyTeam.update({
        where: { id: team.id },
        data: {
          logoUrl: team.logoUrl,
          providerLogoUrl: team.providerLogoUrl,
          lockedFields: team.lockedFields,
        },
      });
    }
    const kind = assetIdFromRef(team.logoUrl) ? "uploaded" : team.logoUrl ? "provider" : "cleared";
    console.log(`  team ${team.name.padEnd(24)} <- ${kind}`);
    teamsWritten += 1;
  }
  console.log(`teams:      ${teamsWritten} of ${teams.length} to update`);

  // 3. Franchises, which are the cross-season fallback crest.
  const franchises = await source.franchise.findMany({
    select: { id: true, name: true, logoUrl: true },
  });
  let franchisesWritten = 0;
  for (const franchise of franchises) {
    const current = await target.franchise.findUnique({
      where: { id: franchise.id },
      select: { logoUrl: true },
    });
    if (!current) {
      console.warn(`  ! no target row for franchise ${franchise.name}`);
      missing += 1;
      continue;
    }
    if (current.logoUrl === franchise.logoUrl) continue;
    if (apply) {
      await target.franchise.update({
        where: { id: franchise.id },
        data: { logoUrl: franchise.logoUrl },
      });
    }
    franchisesWritten += 1;
  }
  console.log(`franchises: ${franchisesWritten} of ${franchises.length} to update`);

  // 4. The league crest itself.
  const leagues = await source.league.findMany({ select: { id: true, name: true, logoUrl: true } });
  let leaguesWritten = 0;
  for (const league of leagues) {
    const current = await target.league.findUnique({
      where: { id: league.id },
      select: { logoUrl: true },
    });
    if (!current) {
      console.warn(`  ! no target row for league ${league.name}`);
      missing += 1;
      continue;
    }
    if (current.logoUrl === league.logoUrl) continue;
    if (apply) {
      await target.league.update({ where: { id: league.id }, data: { logoUrl: league.logoUrl } });
    }
    leaguesWritten += 1;
  }
  console.log(`leagues:    ${leaguesWritten} of ${leagues.length} to update`);

  console.log(
    `\n${apply ? "Done." : "Nothing written. Re-run with --apply."}` +
      (missing > 0 ? ` ${missing} row(s) had no match on the target.` : ""),
  );
} finally {
  await source.$disconnect();
  await target.$disconnect();
}

if (missing > 0) process.exit(1);
