"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/session";
import {
  assetRef,
  isAllowedImageType,
  isSafeImageUrl,
  MAX_IMAGE_BYTES,
  sniffImageType,
} from "@/lib/images";

export type LogoActionState = {
  ok?: boolean;
  error?: string;
  /** Echoed back so a page full of forms can show the result on the right row. */
  targetId?: string;
};

const LOGO_FIELD = "logoUrl";

const schema = z.object({
  target: z.enum(["team", "franchise", "league"]),
  targetId: z.string().min(1),
  mode: z.enum(["upload", "url", "clear", "revert"]),
  // Nullable, not just optional. `FormData.get` returns null for a field that
  // was never rendered, and every mode except "url" renders no URL input at
  // all — Zod's `.optional()` accepts undefined but rejects null, so a plain
  // `.optional()` here failed the parse on upload, clear, and revert.
  logoUrl: z.string().trim().nullish(),
});

/**
 * Store an uploaded image and return the reference to put in a logo column.
 *
 * The declared `File.type` is ignored in favour of sniffing the leading bytes,
 * because the browser sends whatever the client claims. Identical uploads
 * collapse onto one row via the checksum, so re-uploading the same crest for
 * several seasons does not store it several times.
 */
async function storeUpload(file: File, uploaderId: string): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("That file was empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }

  const mimeType = sniffImageType(bytes);
  if (!mimeType || !isAllowedImageType(mimeType)) {
    throw new Error("That is not a PNG, JPEG, WebP, GIF, or SVG image.");
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");

  const existing = await db.imageAsset.findUnique({
    where: { checksum },
    select: { id: true },
  });
  if (existing) return assetRef(existing.id);

  const created = await db.imageAsset.create({
    data: {
      mimeType,
      bytes: Buffer.from(bytes),
      byteSize: bytes.byteLength,
      checksum,
      uploadedById: uploaderId,
    },
    select: { id: true },
  });

  return assetRef(created.id);
}

/** Add or drop `logoUrl` from a row's locked fields, without disturbing any
 *  other field an admin has pinned. */
function withLock(current: string[], locked: boolean): string[] {
  const set = new Set(current);
  if (locked) set.add(LOGO_FIELD);
  else set.delete(LOGO_FIELD);
  return [...set];
}

/**
 * Set, replace, or revert the crest on a team, franchise, or league.
 *
 * A team logo an admin sets here is pinned in `lockedFields`, so the next sync
 * leaves it alone. That matters most for the teams ESPN cannot serve at all:
 * without the pin, every sync would overwrite the uploaded crest with the
 * mystique-api URL that answers 401 to everyone, and the logo would silently
 * disappear again.
 */
export async function saveLogo(
  _prev: LogoActionState,
  formData: FormData,
): Promise<LogoActionState> {
  const actor = await requireApiRole("ADMIN");

  const parsed = schema.safeParse({
    target: formData.get("target"),
    targetId: formData.get("targetId"),
    mode: formData.get("mode"),
    logoUrl: formData.get("logoUrl"),
  });
  if (!parsed.success) {
    // Name the offending field: a bare "malformed" told us nothing when this
    // was rejecting every upload.
    const issue = parsed.error.issues[0];
    return {
      error: `That request was malformed (${issue?.path.join(".") || "unknown field"}).`,
    };
  }

  const { target, targetId, mode } = parsed.data;
  const fail = (error: string): LogoActionState => ({ error, targetId });

  let value: string | null = null;

  if (mode === "upload") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("Choose an image file first.");
    }
    try {
      value = await storeUpload(file, actor.id);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "That upload failed.");
    }
  } else if (mode === "url") {
    const url = parsed.data.logoUrl?.trim() ?? "";
    if (!url) return fail("Paste an image URL first.");
    if (!isSafeImageUrl(url)) return fail("Only http and https image URLs are allowed.");
    value = url;
  }
  // "clear" leaves value null. "revert" is resolved per-target below.

  try {
    if (target === "team") {
      const team = await db.fantasyTeam.findUnique({
        where: { id: targetId },
        select: { lockedFields: true, providerLogoUrl: true },
      });
      if (!team) return fail("That team no longer exists.");

      // Reverting hands the row back to the provider: restore what ESPN last
      // reported and unpin the field so future syncs own it again.
      const isRevert = mode === "revert";
      await db.fantasyTeam.update({
        where: { id: targetId },
        data: {
          logoUrl: isRevert ? team.providerLogoUrl : value,
          lockedFields: withLock(team.lockedFields, !isRevert),
        },
      });
    } else if (target === "franchise") {
      // A franchise carries no provider logo — ESPN has no franchise concept,
      // so this column is manual by definition and nothing can clobber it.
      if (mode === "revert") return fail("A franchise crest has nothing to revert to.");
      const franchise = await db.franchise.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!franchise) return fail("That franchise no longer exists.");
      await db.franchise.update({ where: { id: targetId }, data: { logoUrl: value } });
    } else {
      if (mode === "revert") return fail("A league crest has nothing to revert to.");
      const league = await db.league.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!league) return fail("That league no longer exists.");
      await db.league.update({ where: { id: targetId }, data: { logoUrl: value } });
    }
  } catch {
    return fail("Saving that logo failed.");
  }

  revalidatePath("/", "layout");
  return { ok: true, targetId };
}
