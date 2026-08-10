import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

/** Edge-safe half of the auth config. Middleware imports only this, because
 *  Prisma and bcrypt cannot run in the edge runtime. No providers here — the
 *  Credentials provider lives in auth.ts alongside the database. */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
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
