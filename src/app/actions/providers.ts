"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/session";
import { encryptJson, decryptJson } from "@/lib/crypto";
import { getProvider } from "@/lib/providers/registry";
import type { ProviderCredentials } from "@/lib/providers/types";
import { runSync } from "@/lib/sync/run";

export type ProviderActionState = {
  ok?: boolean;
  message?: string;
  detail?: string[];
};

const connectSchema = z.object({
  leagueId: z.string().min(1),
  provider: z.enum(["ESPN", "YAHOO", "SLEEPER", "NFL", "MANUAL"]),
  providerLeagueId: z.string().trim().min(1, "Enter the league id"),
  swid: z.string().trim().optional(),
  espnS2: z.string().trim().optional(),
});

/**
 * Stores the provider connection. Secrets arrive here from a server action and
 * are encrypted before they touch the database; they are never returned to the
 * browser afterwards.
 */
export async function connectProvider(
  _prev: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  await requireApiRole("SUPER_ADMIN");

  const parsed = connectSchema.safeParse({
    leagueId: formData.get("leagueId"),
    provider: formData.get("provider"),
    providerLeagueId: formData.get("providerLeagueId"),
    swid: formData.get("swid"),
    espnS2: formData.get("espnS2"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { leagueId, provider, providerLeagueId } = parsed.data;

  // An ESPN league id is always numeric. Checking here turns a pasted email or
  // a copied URL into a message that says what is wrong, instead of a request
  // to .../leagues/<whatever> that ESPN rejects with a bare 400.
  if (provider === "ESPN" && !/^\d+$/.test(providerLeagueId)) {
    return {
      ok: false,
      message: `"${providerLeagueId}" is not an ESPN league id. It is the number after ?leagueId= in your league URL, digits only.`,
    };
  }

  // Blank secret fields mean "leave what is stored alone", so an admin can
  // edit the league id without re-pasting cookies.
  const existing = await db.providerCredential.findUnique({ where: { leagueId } });
  const current: ProviderCredentials = existing?.encryptedData
    ? safeDecrypt(existing.encryptedData)
    : {};

  const credentials: ProviderCredentials = {
    ...current,
    ...(parsed.data.swid ? { swid: parsed.data.swid } : {}),
    ...(parsed.data.espnS2 ? { espnS2: parsed.data.espnS2 } : {}),
  };

  await db.providerCredential.upsert({
    where: { leagueId },
    create: {
      leagueId,
      provider,
      providerLeagueId,
      encryptedData: encryptJson(credentials),
    },
    update: {
      provider,
      providerLeagueId,
      encryptedData: encryptJson(credentials),
    },
  });

  await db.league.update({ where: { id: leagueId }, data: { provider } });

  revalidatePath("/admin/sync");
  return { ok: true, message: "Connection saved." };
}

const importSchema = z.object({
  // Digits only — this route is ESPN-only, and a pasted email or full URL
  // otherwise fails later as a bare 400 from ESPN.
  providerLeagueId: z
    .string()
    .trim()
    .min(1, "Enter your ESPN league id")
    .regex(/^\d+$/, "An ESPN league id is digits only — the number after ?leagueId= in your league URL."),
  season: z.coerce.number().int().min(1990).max(2100),
  swid: z.string().trim().optional(),
  espnS2: z.string().trim().optional(),
});

/**
 * Creates a brand new league from an ESPN league id and imports it.
 *
 * This exists because the alternative — attaching a real ESPN league to an
 * existing placeholder league record — would graft real history onto the wrong
 * archive. The league's name comes from ESPN so it matches what people
 * actually call it.
 */
export async function importNewLeague(
  _prev: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  const actor = await requireApiRole("SUPER_ADMIN");

  const parsed = importSchema.safeParse({
    providerLeagueId: formData.get("providerLeagueId"),
    season: formData.get("season"),
    swid: formData.get("swid"),
    espnS2: formData.get("espnS2"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { providerLeagueId, season } = parsed.data;
  const credentials: ProviderCredentials = {
    ...(parsed.data.swid ? { swid: parsed.data.swid } : {}),
    ...(parsed.data.espnS2 ? { espnS2: parsed.data.espnS2 } : {}),
  };

  const provider = getProvider("ESPN");
  if (!provider) return { ok: false, message: "ESPN provider unavailable." };

  // Probe before creating anything, so a bad id or missing cookies does not
  // leave an empty league behind.
  const check = await provider.checkConnection({ providerLeagueId, credentials }, season);
  if (!check.ok) return { ok: false, message: check.message };

  const slug = slugifyLeague(check.leagueName ?? `espn-${providerLeagueId}`);
  const existing = await db.league.findFirst({
    where: {
      OR: [{ slug }, { providerCredential: { providerLeagueId } }],
    },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      ok: false,
      message: `“${existing.name}” already exists for that league. Use the connection form above to re-sync it.`,
    };
  }

  const league = await db.league.create({
    data: {
      slug,
      name: check.leagueName ?? `ESPN league ${providerLeagueId}`,
      foundedYear: check.seasons?.length ? Math.min(...check.seasons) : season,
      provider: "ESPN",
      accentColor: "#2D8CFF",
      secondColor: "#F59E0B",
      providerCredential: {
        create: {
          provider: "ESPN",
          providerLeagueId,
          encryptedData: encryptJson(credentials),
        },
      },
      // The person importing gets access immediately; everyone else is added
      // when their team is claimed.
      memberships: { create: { userId: actor.id, role: "COMMISSIONER" } },
    },
  });

  const outcome = await runSync(db, {
    leagueId: league.id,
    seasons: check.seasons?.length ? check.seasons : [season],
    mode: "FULL",
    triggeredByUserId: actor.id,
  });

  revalidatePath("/", "layout");

  return {
    ok: outcome.status !== "FAILED",
    message:
      outcome.status === "FAILED"
        ? `Created “${league.name}” but the import failed.`
        : `Imported “${league.name}” — seasons ${outcome.seasonsImported.join(", ")}, ${outcome.created} rows created.`,
    detail: outcome.errors.map((e) => `${e.entity}: ${e.message}`),
  };
}

function slugifyLeague(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "imported-league";
}

export async function clearProviderCredentials(formData: FormData) {
  await requireApiRole("SUPER_ADMIN");
  const leagueId = String(formData.get("leagueId"));
  await db.providerCredential.deleteMany({ where: { leagueId } });
  revalidatePath("/admin/sync");
}

/** Probes the provider and reports back without writing any league data. */
export async function testProviderConnection(
  _prev: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  await requireApiRole("ADMIN");

  const leagueId = String(formData.get("leagueId"));
  const season = Number(formData.get("season")) || new Date().getFullYear();

  const credential = await db.providerCredential.findUnique({ where: { leagueId } });
  if (!credential) return { ok: false, message: "This league is not connected yet." };

  const provider = getProvider(credential.provider);
  if (!provider) {
    return { ok: false, message: `No implementation for ${credential.provider}.` };
  }

  const result = await provider.checkConnection(
    {
      providerLeagueId: credential.providerLeagueId ?? "",
      credentials: safeDecrypt(credential.encryptedData),
    },
    season,
  );

  return {
    ok: result.ok,
    message: result.message,
    detail: result.seasons?.length
      ? [`Seasons available: ${result.seasons.join(", ")}`]
      : undefined,
  };
}

export async function triggerSync(
  _prev: ProviderActionState,
  formData: FormData,
): Promise<ProviderActionState> {
  const actor = await requireApiRole("ADMIN");

  const leagueId = String(formData.get("leagueId"));
  const seasonsRaw = String(formData.get("seasons") ?? "").trim();
  const seasons = seasonsRaw
    ? seasonsRaw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 1990)
    : undefined;

  try {
    const outcome = await runSync(db, {
      leagueId,
      seasons,
      mode: seasons && seasons.length > 1 ? "HISTORICAL" : "INCREMENTAL",
      withBoxScores: formData.get("withBoxScores") === "on",
      triggeredByUserId: actor.id,
    });

    revalidatePath("/", "layout");

    return {
      ok: outcome.status !== "FAILED",
      message:
        outcome.status === "SUCCESS"
          ? `Imported ${outcome.seasonsImported.join(", ") || "nothing"}. ${outcome.created} created, ${outcome.updated} updated.`
          : outcome.status === "PARTIAL"
            ? `Imported ${outcome.seasonsImported.join(", ")} with ${outcome.errors.length} problem(s).`
            : "Sync failed.",
      detail: outcome.errors.map((e) => `${e.entity}: ${e.message}`),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Sync failed.",
    };
  }
}

function safeDecrypt(stored: string): ProviderCredentials {
  try {
    return decryptJson<ProviderCredentials>(stored);
  } catch {
    return {};
  }
}
