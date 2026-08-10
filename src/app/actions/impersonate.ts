"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApiRole, VIEW_AS_COOKIE } from "@/lib/session";
import { db } from "@/lib/db";

export async function startImpersonating(userId: string) {
  await requireApiRole("SUPER_ADMIN");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) throw new Error("User not found");

  (await cookies()).set(VIEW_AS_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  revalidatePath("/", "layout");
}

export async function stopImpersonating() {
  // Any signed-in user may clear the cookie; only Super Admins can ever set it.
  (await cookies()).delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}
