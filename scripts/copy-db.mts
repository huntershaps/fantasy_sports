import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Copies every row from one database into another.
 *
 * Written to seed production from a local database that already holds
 * corrected data, so the corrections do not have to be re-derived by importing
 * from ESPN again.
 *
 * Two things make this more than a loop over tables:
 *
 * 1. **Insert order.** Tables are written in dependency order, derived from
 *    schema.prisma rather than hand-maintained, so adding a model does not
 *    silently break this.
 *
 * 2. **Cycles.** Season points at FantasyTeam (champion, runnerUp) and
 *    FantasyTeam points back at Season, which no ordering can satisfy. Every
 *    such edge is nullable, so those columns are nulled on insert and patched
 *    in a second pass once both sides exist. `pg_dump --data-only` hits the
 *    same wall and cannot do this, which is why it is not used.
 *
 *   SOURCE_URL=... TARGET_URL=... pnpm exec tsx scripts/copy-db.mts [--force]
 *
 * Refuses to run against a non-empty target unless --force is passed.
 */
const force = process.argv.includes("--force");
const sourceUrl = process.env.SOURCE_URL;
const targetUrl = process.env.TARGET_URL;

if (!sourceUrl || !targetUrl) {
  console.error("Set SOURCE_URL and TARGET_URL.");
  process.exit(1);
}
if (sourceUrl === targetUrl) {
  console.error("SOURCE_URL and TARGET_URL are the same database.");
  process.exit(1);
}

/** Model order and the FK columns that must be deferred, from schema.prisma. */
function analyseSchema() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((m) => ({
    name: m[1],
    body: m[2],
  }));
  const names = new Set(models.map((m) => m.name));

  const hard: Record<string, Set<string>> = {};
  const deferredByModel: Record<string, Set<string>> = {};

  for (const { name, body } of models) {
    hard[name] = new Set();
    deferredByModel[name] ??= new Set();
    for (const line of body.split("\n")) {
      const rel = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);
      if (!rel) continue;
      const rawType = line.trim().split(/\s+/)[1];
      const target = rawType.replace(/[[\]?]/g, "");
      if (!names.has(target)) continue;

      const cols = rel[1].split(",").map((c) => c.trim());
      // A nullable or self-referencing edge can be filled in afterwards; a
      // required edge to another table dictates insert order.
      if (rawType.includes("?") || target === name) {
        cols.forEach((c) => deferredByModel[name].add(c));
      } else {
        hard[name].add(target);
      }
    }
  }

  const order: string[] = [];
  const placed = new Set<string>();
  let progress = true;
  while (progress && order.length < models.length) {
    progress = false;
    for (const { name } of models) {
      if (placed.has(name)) continue;
      if ([...hard[name]].every((d) => placed.has(d))) {
        order.push(name);
        placed.add(name);
        progress = true;
      }
    }
  }

  const unresolved = models.map((m) => m.name).filter((n) => !placed.has(n));
  if (unresolved.length) {
    throw new Error(`Could not order these models: ${unresolved.join(", ")}`);
  }
  return { order, deferredByModel };
}

const { order, deferredByModel } = analyseSchema();
const clientKey = (model: string) => model[0].toLowerCase() + model.slice(1);

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: sourceUrl }) });
const target = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl }) });

/* eslint-disable @typescript-eslint/no-explicit-any */
const from = (m: string) => (source as any)[clientKey(m)];
const to = (m: string) => (target as any)[clientKey(m)];

try {
  const existing = await Promise.all(order.map((m) => to(m).count().catch(() => 0)));
  const totalExisting = existing.reduce((a: number, b: number) => a + b, 0);
  if (totalExisting > 0 && !force) {
    console.error(`Target already holds ${totalExisting} rows. Pass --force to write anyway.`);
    process.exit(1);
  }

  const patches: { model: string; rows: Record<string, unknown>[] }[] = [];
  let copied = 0;

  for (const model of order) {
    const rows: Record<string, unknown>[] = await from(model).findMany();
    if (rows.length === 0) {
      console.log(`  ${model.padEnd(22)} 0`);
      continue;
    }

    const deferred = [...(deferredByModel[model] ?? [])];
    const held: Record<string, unknown>[] = [];

    const toInsert = rows.map((row) => {
      if (deferred.length === 0) return row;
      const carried = deferred.filter((c) => row[c] !== null && row[c] !== undefined);
      if (carried.length > 0) {
        held.push({ id: row.id, ...Object.fromEntries(carried.map((c) => [c, row[c]])) });
      }
      return { ...row, ...Object.fromEntries(deferred.map((c) => [c, null])) };
    });

    // Batched so a large table does not build one enormous statement.
    for (let i = 0; i < toInsert.length; i += 500) {
      await to(model).createMany({ data: toInsert.slice(i, i + 500), skipDuplicates: true });
    }

    copied += rows.length;
    if (held.length > 0) patches.push({ model, rows: held });
    console.log(`  ${model.padEnd(22)} ${rows.length}${held.length ? `  (${held.length} deferred)` : ""}`);
  }

  if (patches.length > 0) {
    console.log("\nPatching deferred references:");
    for (const { model, rows } of patches) {
      for (const row of rows) {
        const { id, ...data } = row;
        await to(model).update({ where: { id }, data });
      }
      console.log(`  ${model.padEnd(22)} ${rows.length}`);
    }
  }

  console.log("\nVerifying row counts match:");
  let mismatch = 0;
  for (const model of order) {
    const [a, b] = await Promise.all([from(model).count(), to(model).count()]);
    if (a !== b) {
      console.log(`  MISMATCH ${model}: source ${a}, target ${b}`);
      mismatch++;
    }
  }
  console.log(mismatch === 0 ? `  all ${order.length} tables match (${copied} rows)` : `  ${mismatch} tables differ`);
  process.exitCode = mismatch === 0 ? 0 : 1;
} finally {
  await source.$disconnect();
  await target.$disconnect();
}
