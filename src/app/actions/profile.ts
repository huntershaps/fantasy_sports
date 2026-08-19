"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/session";
import { isSafeImageUrl } from "@/lib/images";

export type ProfileFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(400, "Keep it under 400 characters").optional().or(z.literal("")),
  image: z
    .string()
    .trim()
    .url("Enter a full image URL, or leave it blank")
    .optional()
    .or(z.literal("")),
});

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await requireApiRole("USER");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    image: formData.get("image"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const image = parsed.data.image?.trim() ?? "";
  if (image && !isSafeImageUrl(image)) {
    return { fieldErrors: { image: "Only http and https image URLs are allowed." } };
  }

  await db.user.update({
    where: { id: actor.id },
    data: {
      name: parsed.data.name,
      displayName: parsed.data.displayName?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
      image: image || null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

const teamLogoSchema = z.object({
  fantasyTeamId: z.string().min(1),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
});

/** A manager can set the crest for a team they actually managed. */
export async function updateTeamLogo(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const actor = await requireApiRole("USER");

  const parsed = teamLogoSchema.safeParse({
    fantasyTeamId: formData.get("fantasyTeamId"),
    logoUrl: formData.get("logoUrl"),
  });
  if (!parsed.success) return { error: "That did not look like a valid image URL." };

  const membership = await db.teamMembership.findUnique({
    where: {
      userId_fantasyTeamId: {
        userId: actor.id,
        fantasyTeamId: parsed.data.fantasyTeamId,
      },
    },
    select: { id: true },
  });
  if (!membership) return { error: "That is not one of your teams." };

  const logoUrl = parsed.data.logoUrl?.trim() ?? "";
  if (logoUrl && !isSafeImageUrl(logoUrl)) {
    return { error: "Only http and https image URLs are allowed." };
  }

  // Pinned, or the next sync would overwrite it with whatever the provider
  // reports — including the ESPN URLs that answer 401 to everyone, which is
  // exactly the case a manager sets their own crest to work around.
  const team = await db.fantasyTeam.findUnique({
    where: { id: parsed.data.fantasyTeamId },
    select: { lockedFields: true },
  });
  const lockedFields = [...new Set([...(team?.lockedFields ?? []), "logoUrl"])];

  await db.fantasyTeam.update({
    where: { id: parsed.data.fantasyTeamId },
    data: { logoUrl: logoUrl || null, lockedFields },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
