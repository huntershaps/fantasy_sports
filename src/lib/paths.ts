/**
 * The app is mounted under a sub-path of the portfolio domain
 * (huntermshaps.com/fantasy) so it does not need a domain of its own.
 *
 * Next prefixes far more than it first appears. Verified against a running
 * build, `redirect("/leagues")` emits `Location: /fantasy/leagues` — so
 * `redirect()` DOES apply basePath, and passing it a prefixed path yields
 * `/fantasy/fantasy/leagues` and a 404.
 *
 * So the rule is the opposite of what it looks like:
 *
 *   Use a PLAIN path (Next prefixes it for you):
 *     - `redirect()` / `permanentRedirect()` from `next/navigation`
 *     - `href` on `next/link`
 *     - `next/image` src, the router, and anything else framework-owned
 *
 *   Use `withBase()` (nothing prefixes it for you):
 *     - `proxy.ts`, which runs BEFORE the basePath is stripped
 *     - Auth.js `pages` targets and `redirectTo`, which Auth.js resolves
 *       against its own base URL rather than through Next
 *     - any URL that leaves the app entirely — emails, scripts, logs
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

/**
 * Routes for the places Next does NOT rewrite — Auth.js config and proxy.ts.
 * Do not pass these to `redirect()` or `next/link`; those prefix on their own
 * and would produce `/fantasy/fantasy/...`.
 */
export const ROUTES = {
  login: withBase("/login"),
  home: withBase("/home"),
} as const;
