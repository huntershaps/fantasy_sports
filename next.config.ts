import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is served under huntermshaps.com/fantasy so that it shares the
  // portfolio's domain. basePath moves every route, API handler and /_next
  // asset under that prefix; next/link and next/image prefix themselves, but
  // anything that builds a URL by hand must use BASE_PATH from src/lib/paths.
  basePath: "/fantasy",
  experimental: {
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
