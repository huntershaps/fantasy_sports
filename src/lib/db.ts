import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  // Reuse across hot reloads so dev doesn't exhaust the connection pool.
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = created;
  return created;
}

/**
 * Built on first use, not on import.
 *
 * `next build` evaluates every route module to collect its config, which means
 * importing this file. Constructing the client at module scope therefore ran
 * `createClient()` during the build — and threw "DATABASE_URL is not set" in
 * any environment that has the variable at runtime but not at build time.
 * Netlify deploy previews are exactly that: production deploys carry the
 * variable, preview contexts do not, so the first pull request failed to build
 * on a file that had nothing to do with the change.
 *
 * The proxy defers construction to the first property access, which only
 * happens while handling a request. Methods are bound to the real client so
 * `db.user.findMany` and `db.$transaction` behave normally.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    // The real client is the receiver on purpose. Prisma exposes its models as
    // getters, and handing those the proxy as `this` would route their own
    // property reads straight back through here.
    const instance = client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, property) {
    return Reflect.has(client(), property);
  },
});
