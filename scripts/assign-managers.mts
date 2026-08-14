import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Links imported ESPN teams to people.
 *
 * ESPN exposes owners only as opaque member GUIDs with display names like
 * "ESPNfan5141427114", so the real names have to come from outside the API.
 * Matching is on team name within a league, which works because a franchise
 * keeps its name across the seasons a person owned it.
 *
 * Managers who have not signed up get a placeholder account on the reserved
 * .invalid TLD, which is guaranteed never to resolve — so no mail can be sent
 * to a fabricated address — and no password, so it cannot be signed into. When
 * the real person registers, an admin merges them.
 *
 *   pnpm exec tsx scripts/assign-managers.mts <leagueSlug>
 */
const leagueSlug = process.argv[2] ?? "the-aussie-grillers";

/**
 * The team-to-person mapping lives in `scripts/managers.local.json`, which is
 * gitignored.
 *
 * It is a list of real people's full names next to the teams they own. That
 * does not belong in a public repository, and unlike a password it cannot be
 * rotated once it is out. Copy `managers.example.json` and fill it in.
 *
 * A team with no entry is reported as unassigned rather than guessed at, so
 * omitting someone is safe — bot teams belong left out.
 */
const here = dirname(fileURLToPath(import.meta.url));
const mappingPath = process.env.MANAGERS_FILE ?? resolve(here, "managers.local.json");

let MANAGERS: Record<string, string>;
try {
  MANAGERS = JSON.parse(readFileSync(mappingPath, "utf8"));
} catch {
  console.error(`No manager mapping at ${mappingPath}.`);
  console.error("Copy scripts/managers.example.json to scripts/managers.local.json and fill it in.");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function placeholderEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}@unclaimed.invalid`;
}

const league = await db.league.findUniqueOrThrow({
  where: { slug: leagueSlug },
  select: { id: true, name: true },
});

const teams = await db.fantasyTeam.findMany({
  where: { season: { leagueId: league.id } },
  select: {
    id: true,
    name: true,
    season: { select: { year: true } },
    memberships: { select: { id: true } },
  },
  orderBy: [{ season: { year: "desc" } }, { name: "asc" }],
});

const userIdByName = new Map<string, string>();
let linked = 0;
const unassigned: string[] = [];

for (const team of teams) {
  const managerName = MANAGERS[team.name.trim()];
  if (!managerName) {
    unassigned.push(`${team.season.year} · ${team.name}`);
    continue;
  }

  let userId = userIdByName.get(managerName);
  if (!userId) {
    // Reuse a real signed-up account if one already matches by name.
    const existing = await db.user.findFirst({
      where: { name: managerName },
      select: { id: true },
    });
    const user =
      existing ??
      (await db.user.create({
        data: {
          name: managerName,
          email: placeholderEmail(managerName),
          role: "USER",
        },
        select: { id: true },
      }));
    userId = user.id;
    userIdByName.set(managerName, userId);
  }

  await db.teamMembership.upsert({
    where: { userId_fantasyTeamId: { userId, fantasyTeamId: team.id } },
    create: { userId, fantasyTeamId: team.id, isPrimary: true },
    update: {},
  });

  await db.leagueMembership.upsert({
    where: { userId_leagueId: { userId, leagueId: league.id } },
    create: { userId, leagueId: league.id },
    update: {},
  });

  linked++;
}

console.log(`Linked ${linked} of ${teams.length} teams in “${league.name}”.`);
console.log(`Managers: ${userIdByName.size}`);
if (unassigned.length > 0) {
  console.log(`\nStill unassigned (${unassigned.length}):`);
  for (const entry of unassigned) console.log(`  ${entry}`);
}

await db.$disconnect();
