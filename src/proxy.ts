import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { BASE_PATH, withBase } from "@/lib/paths";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Strip the basePath so every rule below is written in terms of the app's own
 * routes. Next 16 runs proxy.ts *before* the basePath is removed, so paths
 * arrive here as "/fantasy/login" rather than "/login".
 */
function toAppRoute(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  return pathname.startsWith(`${BASE_PATH}/`) ? pathname.slice(BASE_PATH.length) : pathname;
}

/** A coarse gate only: it keeps signed-out traffic off app routes and bounces
 *  signed-in users away from the auth screens. Real authorization (roles,
 *  league membership) is enforced per-route on the server, never here. */
export default auth((req) => {
  const pathname = toAppRoute(req.nextUrl.pathname);

  // Framework assets must never be gated: redirecting them would strip the
  // login page of its own CSS and JS for exactly the users who need it. The
  // matcher below already excludes them; this is the guarantee that a matcher
  // edit cannot lock signed-out visitors out of the stylesheet.
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isSignedIn = Boolean(req.auth);
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    // Public league archives. The gate that matters is in the query itself —
    // every public query filters on `isPublic: true`, so letting the route
    // through here cannot expose a private league.
    pathname === "/l" ||
    pathname.startsWith("/l/");

  // `clone()` keeps the query and origin but does NOT re-apply the basePath,
  // so redirect targets are written with withBase().
  if (!isSignedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = withBase("/login");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/register")) {
    const url = req.nextUrl.clone();
    url.pathname = withBase("/home");
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  // Matcher patterns are matched against the full request path, basePath
  // included, so the framework-asset exclusions are spelled with the prefix.
  matcher: [
    "/((?!fantasy/_next/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
