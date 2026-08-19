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
    // huntermshaps.com currently redirects to huntershaps.netlify.app, so the
    // origin a browser actually sends is the netlify.app one. Both are listed:
    // the custom domain is here so that promoting it to the primary domain
    // later does not silently break every form.
    serverActions: {
      // Logo uploads go through a Server Action, and the default cap is 1 MB.
      // MAX_IMAGE_BYTES in src/lib/images.ts rejects anything over 2 MB with a
      // readable message; this headroom is what lets that check run instead of
      // the framework failing the request first with an opaque error.
      bodySizeLimit: "4mb",
      allowedOrigins: [
        ...(process.env.PUBLIC_ORIGIN ? [process.env.PUBLIC_ORIGIN] : []),
        "huntershaps.netlify.app",
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
    // ESPN serves team logos from several hosts, not just a.espncdn.com:
    // g.espncdn.com for the stock logo packs, and mystique-api for the ones
    // managers upload themselves. A host missing here is not a soft failure —
    // the optimizer answers 400 and every logo renders broken.
    remotePatterns: [
      { protocol: "https", hostname: "**.espncdn.com" },
      { protocol: "https", hostname: "**.fantasy.espn.com" },
      { protocol: "https", hostname: "**.yimg.com" },
      { protocol: "https", hostname: "sleepercdn.com" },
    ],
    // Note: nothing currently renders through next/image — Crest uses a plain
    // <img> on purpose, because profile pictures are user-supplied URLs on
    // arbitrary hosts. These patterns are here for when something does.
    //
    // Most stock ESPN logos are SVG, which the optimizer refuses without
    // `dangerouslyAllowSVG`. That is deliberately NOT enabled: an SVG can
    // carry script, and turning it on for a code path nothing uses would be
    // taking on risk for no benefit. Enable it — together with
    // contentDispositionType "attachment" and a sandboxing CSP — only if
    // logos ever move to next/image.
  },
};

export default nextConfig;
