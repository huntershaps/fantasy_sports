import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Grants a role to an existing account.
 *
 * This exists to solve a bootstrap problem: registration always creates a
 * plain USER, and only a SUPER_ADMIN can change roles from /admin/users — so
 * a fresh production database has no way to mint its first SUPER_ADMIN. The
 * seed does it for development, but the seed must never be run against real
 * data.
 *
 * It deliberately does NOT create accounts. Register through the UI first,
 * then run this — that keeps password handling entirely inside the app.
 *
 *   pnpm exec tsx scripts/grant-role.mts
 *   pnpm exec tsx scripts/grant-role.mts someone@example.com ADMIN
 *
 * Against production, point DATABASE_URL at Neon for the one command:
 *
 *   DATABASE_URL="<neon-url>" pnpm exec tsx scripts/grant-role.mts
 */
const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
type Role = (typeof ROLES)[number];

const email = (process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL ?? "hunter@sflinsider.com")
  .trim()
  .toLowerCase();
const role = (process.argv[3] ?? "SUPER_ADMIN").toUpperCase() as Role;

if (!ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Expected one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

try {
  // Emails are stored lowercased at registration, so an exact match is right.
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, isDisabled: true },
  });

  if (!user) {
    console.error(`No account found for ${email}.`);
    console.error("Register through the app first, then run this again.");
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${user.email} is already ${role}. Nothing to do.`);
  } else {
    await db.user.update({ where: { id: user.id }, data: { role } });
    console.log(`${user.email} (${user.name}): ${user.role} -> ${role}`);
  }

  if (user.isDisabled) {
    console.warn(`Note: this account is disabled, so it cannot sign in until that is lifted.`);
  }

  const superAdmins = await db.user.count({ where: { role: "SUPER_ADMIN" } });
  console.log(`Super admins on this database: ${superAdmins}`);
} finally {
  await db.$disconnect();
}
