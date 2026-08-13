/**
 * The app is mounted under a sub-path of the portfolio domain
 * (huntermshaps.com/fantasy) so it does not need a domain of its own.
 *
 * Next.js prefixes `next/link`, `next/image` and the router automatically, but
 * three things it does NOT prefix, and which therefore have to go through the
 * helpers here:
 *
 *   - `redirect()` / `permanentRedirect()` from `next/navigation`
 *   - Auth.js `pages` targets and its API route base
 *   - any hand-built URL string (fetch, Location headers, emails)
 *
 * Keep this in sync with `basePath` in next.config.ts. It is deliberately a
 * literal rather than an env var so it is available in the edge runtime and at
 * build time without configuration.
 */
export const BASE_PATH = "/fantasy";

/** Prefix an app-absolute path with the base path. `withBase("/login")`. */
export function withBase(path: string): string {
  if (!path.startsWith("/")) throw new Error(`withBase expects an absolute path, got "${path}"`);
  return `${BASE_PATH}${path}`;
}

/**
 * The value AUTH_URL must hold in every deployed environment.
 *
 * Auth.js keeps its default `/api/auth` basePath because Next strips its own
 * basePath before a route handler runs — so the handler genuinely does see
 * /api/auth/session. AUTH_URL is how Auth.js learns the externally visible
 * URL it should build callbacks and redirects against.
 *
 *   AUTH_URL=https://huntermshaps.com/fantasy/api/auth
 */
export const AUTH_URL_PATH = withBase("/api/auth");

/** Routes referenced from places Next cannot rewrite for us. */
export const ROUTES = {
  login: withBase("/login"),
  home: withBase("/home"),
} as const;
