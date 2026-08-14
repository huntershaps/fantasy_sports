import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Mints a password-reset link for an existing account and prints it.
 *
 * There is no mail transport yet, so the in-app "forgot password" flow can
 * create a token but has no way to deliver it. This is the operator's path:
 * run it, open the link, choose a password in the app.
 *
 * It deliberately does not set a password. The token is single-use and the
 * password is chosen through the normal reset screen, so no password is ever
 * typed into a terminal, stored in shell history, or seen by anyone but you.
 *
 *   pnpm exec tsx scripts/reset-link.mts
 *   pnpm exec tsx scripts/reset-link.mts someone@example.com
 *   BASE_URL=https://huntermshaps.com pnpm exec tsx scripts/reset-link.mts
 */
const email = (process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL ?? "hunter@sflinsider.com")
  .trim()
  .toLowerCase();

const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const TTL_MINUTES = 60;

// Must match the hashing in src/app/actions/password-reset.ts.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

try {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isDisabled: true },
  });

  if (!user) {
    console.error(`No account found for ${email}.`);
    console.error("Register through the app first, then run this again.");
    process.exit(1);
  }

  if (user.isDisabled) {
    console.error(`${user.email} is disabled and cannot sign in. Re-enable it first.`);
    process.exit(1);
  }

  // Clear any outstanding tokens so an old link cannot be used later.
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
    },
  });

  console.log(`Reset link for ${user.email} (${user.name}) — valid ${TTL_MINUTES} minutes, single use:\n`);
  console.log(`  ${baseUrl}/fantasy/reset-password?token=${token}\n`);
  console.log("Open it and choose a password. Do not share it — it is a sign-in.");
} finally {
  await db.$disconnect();
}
