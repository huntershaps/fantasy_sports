"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/session";
import { rebuildAllLeagues, rebuildLeagueDerivedData } from "@/lib/engine/rebuild";

const roleSchema = z.enum(["USER", "ADMIN", "SUPER_ADMIN"]);

export async function setUserRole(formData: FormData) {
  const actor = await requireApiRole("SUPER_ADMIN");

  const userId = String(formData.get("userId"));
  const role = roleSchema.parse(formData.get("role"));

  // Without this, the last Super Admin could lock everyone out of the admin UI.
  if (userId === actor.id && role !== "SUPER_ADMIN") {
    throw new Error("You cannot remove your own Super Admin role.");
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

/**
 * Publish or unpublish a league's read-only archive at /l/<slug>.
 *
 * Restricted to Super Admin rather than Admin: this is the one setting that
 * takes real people's names from behind a login and puts them on the open
 * internet, so it should not be a click any admin can make by accident.
 */
export async function setLeaguePublic(formData: FormData) {
  await requireApiRole("SUPER_ADMIN");

  const leagueId = String(formData.get("leagueId"));
  const isPublic = formData.get("isPublic") === "true";

  const league = await db.league.update({
    where: { id: leagueId },
    data: { isPublic },
    select: { slug: true },
  });

  revalidatePath("/admin/leagues");
  revalidatePath(`/l/${league.slug}`);
}

export async function setUserDisabled(formData: FormData) {
  const actor = await requireApiRole("SUPER_ADMIN");

  const userId = String(formData.get("userId"));
  const disabled = formData.get("disabled") === "true";

  if (userId === actor.id) throw new Error("You cannot disable your own account.");

  await db.user.update({ where: { id: userId }, data: { isDisabled: disabled } });
  revalidatePath("/admin/users");
}

export type RebuildResult = {
  ok: boolean;
  message: string;
  details?: string[];
};

/** Recomputes records, awards, and memories from raw game data. Manual rows
 *  are untouched, so this is always safe to run. */
export async function rebuildDerivedData(
  _prev: RebuildResult | undefined,
  formData: FormData,
): Promise<RebuildResult> {
  await requireApiRole("ADMIN");

  const leagueId = String(formData.get("leagueId") || "");

  try {
    const summaries = leagueId
      ? [await rebuildLeagueDerivedData(db, leagueId)]
      : await rebuildAllLeagues(db);

    revalidatePath("/", "layout");

    return {
      ok: true,
      message: `Rebuilt ${summaries.length} league${summaries.length === 1 ? "" : "s"}.`,
      details: summaries.map(
        (s) =>
          `${s.leagueName}: ${s.currentRecords} records, ${s.awards} awards, ${s.certificates} certificates, ${s.memories} memories (${s.durationMs}ms)`,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Rebuild failed.",
    };
  }
}

export async function setMemoryFeatured(formData: FormData) {
  await requireApiRole("ADMIN");
  await db.memory.update({
    where: { id: String(formData.get("memoryId")) },
    data: { isFeatured: formData.get("featured") === "true" },
  });
  revalidatePath("/admin/memories");
}

export async function setMemoryHidden(formData: FormData) {
  await requireApiRole("ADMIN");
  await db.memory.update({
    where: { id: String(formData.get("memoryId")) },
    data: { isHidden: formData.get("hidden") === "true" },
  });
  revalidatePath("/admin/memories");
  revalidatePath("/memories");
}

export async function verifyRecord(formData: FormData) {
  const actor = await requireApiRole("ADMIN");
  await db.leagueRecord.update({
    where: { id: String(formData.get("recordId")) },
    data: { verifiedByUserId: actor.id, verifiedAt: new Date() },
  });
  revalidatePath("/admin/records");
}
