import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assetIdFromRef, isUnservableProviderImage } from "../src/lib/images";

/**
 * Spread an uploaded crest across every season the same franchise played.
 *
 * Logos get uploaded on whichever season happens to be on screen — usually the
 * current one — but a franchise is the same club in every year it appears, so
 * an upload should carry backwards. This finds each franchise's most recent
 * uploaded crest and applies it to that franchise's other seasons.
 *
 * Only uploads propagate. A provider URL is left where it is: ESPN's own art is
 * already per-season and copying it around would achieve nothing.
 *
 *   pnpm exec tsx scripts/propagate-logos.mts            # preview, writes nothing
 *   pnpm exec tsx scripts/propagate-logos.mts --apply    # write
 *   pnpm exec tsx scripts/propagate-logos.mts --apply --only-broken
 *
 * `--only-broken` restricts writes to seasons whose crest cannot render today
 * (missing, or an ESPN CUSTOM_UPLOAD URL that answers 401), leaving seasons
 * that still have working period-accurate ESPN art untouched. That is the
 * conservative choice for a history product; without it every season shows the
 * franchise's current logo.
 *
 * Every write pins "logoUrl" in lockedFields so a later sync cannot undo it.
 * The provider's own value stays in providerLogoUrl, so the admin screen's
 * "Revert to ESPN" still works per team afterwards.
 */
const apply = process.argv.includes("--apply");
const onlyBroken = process.argv.includes("--only-broken");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const teams = await db.fantasyTeam.findMany({
  where: { franchiseId: { not: null } },
  orderBy: { season: { year: "desc" } },
  select: {
    id: true,
    name: true,
    logoUrl: true,
    lockedFields: true,
    franchiseId: true,
    franchise: { select: { name: true, providerFranchiseId: true } },
    season: { select: { year: true } },
  },
});

/** The newest uploaded crest per franchise. Ordering above is year-descending,
 *  so the first upload seen for a franchise is its most recent one. */
const uploadByFranchise = new Map<string, { ref: string; year: number; team: string }>();
for (const team of teams) {
  if (!team.franchiseId || !team.logoUrl) continue;
  if (!assetIdFromRef(team.logoUrl)) continue;
  if (uploadByFranchise.has(team.franchiseId)) continue;
  uploadByFranchise.set(team.franchiseId, {
    ref: team.logoUrl,
    year: team.season.year,
    team: team.name,
  });
}

const unrenderable = (url: string | null) => !url || isUnservableProviderImage(url);

let written = 0;
let skipped = 0;

for (const team of teams) {
  if (!team.franchiseId) continue;
  const upload = uploadByFranchise.get(team.franchiseId);
  if (!upload) continue;
  if (team.logoUrl === upload.ref) continue;

  const label = `${team.season.year} ${team.name.padEnd(24)}`;
  const source = `${upload.year} ${upload.team}`;

  if (onlyBroken && !unrenderable(team.logoUrl)) {
    console.log(`  skip  ${label} keeps its own ${team.season.year} ESPN art`);
    skipped += 1;
    continue;
  }

  const replacing = unrenderable(team.logoUrl) ? "was unrenderable" : "REPLACES working ESPN art";
  console.log(`  set   ${label} <- ${source}  (${replacing})`);

  if (apply) {
    await db.fantasyTeam.update({
      where: { id: team.id },
      data: {
        logoUrl: upload.ref,
        lockedFields: [...new Set([...team.lockedFields, "logoUrl"])],
      },
    });
  }
  written += 1;
}

// Also park the crest on the franchise itself. Nothing needs it today, but a
// season imported later has no team logo of its own yet, and the franchise
// crest is what the queries fall back to — so next year's teams inherit it
// instead of appearing as monograms until someone re-uploads.
let franchisesSet = 0;
for (const [franchiseId, upload] of uploadByFranchise) {
  const franchise = await db.franchise.findUnique({
    where: { id: franchiseId },
    select: { logoUrl: true },
  });
  if (franchise?.logoUrl === upload.ref) continue;
  if (apply) {
    await db.franchise.update({ where: { id: franchiseId }, data: { logoUrl: upload.ref } });
  }
  franchisesSet += 1;
}

console.log(
  `\n${apply ? "Wrote" : "Would write"} ${written} team crest(s), ` +
    `${franchisesSet} franchise fallback(s); ${skipped} left alone.` +
    (apply ? "" : "\nRe-run with --apply to write."),
);

await db.$disconnect();
