"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

export type ResetRequestState = {
  sent?: boolean;
  /** Development only: the link that would have been emailed. */
  devLink?: string;
  error?: string;
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };

  const user = await db.user.findUnique({
    where: { email: email.data.toLowerCase() },
    select: { id: true, isDisabled: true },
  });

  // Always report success so this endpoint cannot be used to discover which
  // email addresses have accounts.
  if (!user || user.isDisabled) return { sent: true };

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // No mail transport is configured yet. In development the link is returned
  // so the flow is testable; in production it must be emailed instead.
  const link = `/reset-password?token=${token}`;
  return process.env.NODE_ENV === "development"
    ? { sent: true, devLink: link }
    : { sent: true };
}

export type ResetState = { error?: string; fieldErrors?: Record<string, string>; done?: boolean };

const resetSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(10, "Use at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export async function completePasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    select: { id: true, userId: true, expires: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expires < new Date()) {
    return { error: "That reset link has expired. Request a new one." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other outstanding links for this account stop working.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { done: true };
}
