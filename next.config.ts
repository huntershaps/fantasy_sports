import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
