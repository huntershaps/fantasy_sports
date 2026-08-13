import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is served under huntermshaps.com/fantasy so that it shares the
  // portfolio's domain. basePath moves every route, API handler and /_next
  // asset under that prefix; next/link and next/image prefix themselves, but
  // anything that builds a URL by hand must use BASE_PATH from src/lib/paths.
  basePath: "/fantasy",
  experimental: {
    // The app is reached through a proxy, so the browser's Origin is the
    // public domain while the app itself sees the host it is deployed on.
    // Next treats that mismatch as CSRF and aborts every Server Action —
    // login, register, password reset, admin role changes, all of it — with
    // "Invalid Server Actions request". These are the origins allowed to
    // reach it: the public domain, and the local portfolio server that
    // reproduces the same proxy hop in development.
    // PUBLIC_ORIGIN overrides the default without a code change, because
    // getting this list wrong breaks every form on the site.
    serverActions: {
      allowedOrigins: [
        ...(process.env.PUBLIC_ORIGIN ? [process.env.PUBLIC_ORIGIN] : []),
        "huntermshaps.com",
        "www.huntermshaps.com",
        "localhost:8000",
      ],
    },
    // Enables forbidden() / unauthorized() so authorization failures render a
    // real 403/401 page instead of redirecting to a misleading login screen.
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "s.yimg.com" },
      { protocol: "https", hostname: "sleepercdn.com" },
    ],
  },
};

export default nextConfig;
