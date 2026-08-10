import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
};

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function hasRole(role: UserRole, required: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export const VIEW_AS_COOKIE = "mfs-view-as";

/** The signed-in account. This is always the real actor, never the
 *  impersonated user — authorization decisions must use this. */
export const getActor = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Re-read the row so a role change or disable takes effect on the next
  // request instead of waiting for the 30-day JWT to expire.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, role: true, isDisabled: true },
  });
  if (!user || user.isDisabled) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
});

export type ViewContext = {
  /** Who is signed in. Governs what is permitted. */
  actor: SessionUser;
  /** Whose experience is being rendered. Governs what is personalized. */
  viewer: SessionUser;
  isImpersonating: boolean;
};

/** Super Admins can render the site as another member to verify what that
 *  person sees. Permissions still derive from `actor`, so impersonation can
 *  never be used to escalate. */
export const getViewContext = cache(async (): Promise<ViewContext | null> => {
  const actor = await getActor();
  if (!actor) return null;

  if (actor.role !== "SUPER_ADMIN") {
    return { actor, viewer: actor, isImpersonating: false };
  }

  const targetId = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!targetId || targetId === actor.id) {
    return { actor, viewer: actor, isImpersonating: false };
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
  if (!target) return { actor, viewer: actor, isImpersonating: false };

  return { actor, viewer: target, isImpersonating: true };
});

export async function requireUser(): Promise<SessionUser> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function requireViewContext(): Promise<ViewContext> {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireRole(required: UserRole): Promise<SessionUser> {
  const actor = await requireUser();
  if (!hasRole(actor.role, required)) forbidden();
  return actor;
}

/** For route handlers and server actions, where redirecting is wrong. */
export async function requireApiRole(required: UserRole): Promise<SessionUser> {
  const actor = await getActor();
  if (!actor) unauthorized();
  if (!hasRole(actor.role, required)) forbidden();
  return actor;
}

/** A member sees only leagues they belong to; admins see everything. */
export async function assertLeagueAccess(
  user: SessionUser,
  leagueId: string,
): Promise<void> {
  if (hasRole(user.role, "ADMIN")) return;
  const membership = await db.leagueMembership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
    select: { id: true },
  });
  if (!membership) forbidden();
}

export async function accessibleLeagueIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (hasRole(user.role, "ADMIN")) return "ALL";
  const memberships = await db.leagueMembership.findMany({
    where: { userId: user.id },
    select: { leagueId: true },
  });
  return memberships.map((m) => m.leagueId);
}
