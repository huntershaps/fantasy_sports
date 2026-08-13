import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";
import { ROUTES } from "@/lib/paths";

/** Edge-safe half of the auth config. Middleware imports only this, because
 *  Prisma and bcrypt cannot run in the edge runtime. No providers here — the
 *  Credentials provider lives in auth.ts alongside the database. */
export const authConfig = {
  providers: [],
  // No `basePath` here on purpose. Next strips its own basePath before a route
  // handler runs, so the handler sees /api/auth/session and Auth.js must keep
  // its default to match it — setting /fantasy/api/auth produces
  // "UnknownAction: Cannot parse action". The externally visible prefix is
  // communicated with AUTH_URL instead (see AUTH_URL_VALUE in lib/paths).
  //
  // `pages`, by contrast, are resolved against the origin rather than the
  // basePath, so those do need the prefix spelled out.
  pages: {
    signIn: ROUTES.login,
    error: ROUTES.login,
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? "USER";
        token.id = user.id;
      }
      // Profile edits should be reflected without forcing a re-login.
      if (trigger === "update" && session) {
        const next = session as { name?: string; image?: string | null };
        if (next.name) token.name = next.name;
        if (next.image !== undefined) token.picture = next.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
