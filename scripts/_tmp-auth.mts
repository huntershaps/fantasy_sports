import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const email = "auth-probe@unclaimed.invalid";
const pw = randomBytes(18).toString("base64url");
await db.user.deleteMany({ where: { email } });
await db.user.create({ data: { email, name: "Auth Probe", role: "USER", passwordHash: await bcrypt.hash(pw, 12) } });
console.log(pw); // written to a file by the caller, not shown
await db.$disconnect();
