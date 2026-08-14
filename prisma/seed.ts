import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AWARD_CATALOG } from "../src/lib/awards/catalog";
import { rebuildAllLeagues } from "../src/lib/engine/rebuild";
import { createRng } from "./seed/rng";
import { buildLeague, resetIdCounter } from "./seed/build-league";
import {
  LEAGUE_ONE,
  LEAGUE_ONE_MANAGERS,
  LEAGUE_TWO,
  LEAGUE_TWO_MANAGERS,
  PLAYERS,
  type SeedManager,
} from "./seed/data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SUPER_ADMIN_EMAIL = process.env.SEED_EMAIL ?? "hunter@sflinsider.com";

/**
 * No password is committed to this repository.
 *
 * Set SEED_PASSWORD to choose one; otherwise a random password is generated
 * per run and printed once at the end. A literal here would be a working
 * credential in a public repo for anyone who ever seeded a database and left
 * it reachable.
 */
const DEV_PASSWORD = process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");

async function main() {
  const started = Date.now();
  resetIdCounter();
  const rng = createRng(20260810);

  console.log("Clearing existing data…");
  // Order matters: children before parents, since not every FK cascades.
  await db.$transaction([
    db.memorySubject.deleteMany(),
    db.memory.deleteMany(),
    db.certificate.deleteMany(),
    db.award.deleteMany(),
    db.awardDefinition.deleteMany(),
    db.leagueRecord.deleteMany(),
    db.dataSyncError.deleteMany(),
    db.dataSync.deleteMany(),
    db.matchupPlayer.deleteMany(),
    db.matchup.deleteMany(),
    db.tradeItem.deleteMany(),
    db.rosterTransaction.deleteMany(),
    db.trade.deleteMany(),
    db.draftPick.deleteMany(),
    db.teamMembership.deleteMany(),
    db.leagueMembership.deleteMany(),
  ]);
  // Seasons hold FKs to teams and vice versa, so break the cycle first.
  await db.season.updateMany({ data: { championTeamId: null, runnerUpTeamId: null } });
  await db.$transaction([
    db.fantasyTeam.deleteMany(),
    db.season.deleteMany(),
    db.franchise.deleteMany(),
    db.leagueSettings.deleteMany(),
    db.providerCredential.deleteMany(),
    db.league.deleteMany(),
    db.player.deleteMany(),
    db.passwordResetToken.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.user.deleteMany(),
  ]);

  console.log("Creating users…");
  const allManagers = dedupeManagers([
    ...LEAGUE_ONE_MANAGERS,
    ...LEAGUE_TWO_MANAGERS,
  ]);
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  await db.user.createMany({
    data: allManagers.map((m) => ({
      email: m.email,
      name: m.name,
      passwordHash,
      role: m.email === SUPER_ADMIN_EMAIL ? ("SUPER_ADMIN" as const) : ("USER" as const),
      emailVerified: new Date(),
    })),
  });

  const users = await db.user.findMany({ select: { id: true, email: true } });
  const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));

  console.log(`Creating ${PLAYERS.length} players…`);
  await db.player.createMany({
    data: PLAYERS.map((p) => ({
      fullName: p.name,
      position: p.position,
      nflTeam: p.team,
      provider: "MANUAL" as const,
      providerPlayerId: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    })),
  });

  const players = await db.player.findMany({ select: { id: true, fullName: true } });
  const playerIdByName = new Map(players.map((p) => [p.fullName, p.id]));

  console.log("Creating award definitions…");
  await db.awardDefinition.createMany({
    data: AWARD_CATALOG.map((a, index) => ({
      key: a.key,
      leagueId: null,
      name: a.name,
      icon: a.icon,
      description: a.description,
      tier: a.tier,
      scope: a.scope,
      accentColor: a.accentColor,
      isBuiltIn: true,
      grantsCertificate: a.grantsCertificate ?? false,
      certificateTemplate: a.certificateTemplate ?? null,
      sortOrder: index,
    })),
  });

  const ctx = { db, rng, userIdByEmail, playerIdByName };

  console.log(`Building ${LEAGUE_ONE.name}…`);
  await buildLeague(ctx, LEAGUE_ONE, LEAGUE_ONE_MANAGERS, [
    2021, 2022, 2023, 2024, 2025, 2026,
  ]);

  console.log(`Building ${LEAGUE_TWO.name}…`);
  await buildLeague(ctx, LEAGUE_TWO, LEAGUE_TWO_MANAGERS, [
    2023, 2024, 2025, 2026,
  ]);

  console.log("\nRunning the historical event engine…");
  for (const summary of await rebuildAllLeagues(db)) {
    console.log(
      `  ${summary.leagueName.padEnd(22)} ` +
        `${summary.currentRecords} records (${summary.records} incl. lineage), ` +
        `${summary.awards} awards, ${summary.certificates} certificates, ` +
        `${summary.memories} memories  [${summary.durationMs}ms]`,
    );
  }

  const counts = {
    users: await db.user.count(),
    leagues: await db.league.count(),
    seasons: await db.season.count(),
    teams: await db.fantasyTeam.count(),
    matchups: await db.matchup.count(),
    lineupSlots: await db.matchupPlayer.count(),
    trades: await db.trade.count(),
    transactions: await db.rosterTransaction.count(),
    draftPicks: await db.draftPick.count(),
  };

  console.log("\nSeeded:");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(14)} ${value.toLocaleString()}`);
  }
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`Sign in as ${SUPER_ADMIN_EMAIL} / ${DEV_PASSWORD}`);
}

function dedupeManagers(managers: SeedManager[]): SeedManager[] {
  const seen = new Map<string, SeedManager>();
  for (const m of managers) if (!seen.has(m.email)) seen.set(m.email, m);
  return [...seen.values()];
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
