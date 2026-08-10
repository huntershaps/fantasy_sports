import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

/** A coarse gate only: it keeps signed-out traffic off app routes and bounces
 *  signed-in users away from the auth screens. Real authorization (roles,
 *  league membership) is enforced per-route on the server, never here. */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isSignedIn = Boolean(req.auth);
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api/auth");

  if (!isSignedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/home", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
