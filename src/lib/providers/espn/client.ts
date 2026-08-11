import { ProviderError, type ProviderCredentials } from "@/lib/providers/types";

/** Reads go through the lm-api-reads host. It serves the same v3 payloads as
 *  fantasy.espn.com but is the endpoint ESPN's own client uses for reads, and
 *  it does not redirect browsers to the web app. */
const HOST = "https://lm-api-reads.fantasy.espn.com";
const GAME = "ffl";

export type EspnAuth = {
  swid?: string;
  espnS2?: string;
};

export function authFromCredentials(credentials: ProviderCredentials): EspnAuth {
  return {
    swid: credentials.swid?.trim() || undefined,
    espnS2: credentials.espnS2?.trim() || undefined,
  };
}

/** ESPN expects SWID wrapped in braces. Users copy it inconsistently, so
 *  normalize rather than fail on a formatting detail. */
function normalizeSwid(swid: string): string {
  const bare = swid.trim().replace(/^\{|\}$/g, "");
  return `{${bare}}`;
}

function cookieHeader(auth: EspnAuth): string | undefined {
  const parts: string[] = [];
  if (auth.swid) parts.push(`SWID=${normalizeSwid(auth.swid)}`);
  if (auth.espnS2) parts.push(`espn_s2=${auth.espnS2.trim()}`);
  return parts.length > 0 ? parts.join("; ") : undefined;
}

/**
 * ESPN splits a league across two controllers. The active season lives under
 * `seasons/<year>/segments/0/leagues/<id>` and returns an object; any earlier
 * season lives under `leagueHistory/<id>?seasonId=<year>` and returns a
 * single-element array. Callers should not have to care, so this unwraps both
 * into the same shape.
 */
export function buildUrl(
  leagueId: string,
  seasonYear: number,
  opts: { historical: boolean; views?: string[]; scoringPeriodId?: number },
): string {
  const params = new URLSearchParams();
  for (const view of opts.views ?? []) params.append("view", view);
  if (opts.scoringPeriodId !== undefined) {
    params.set("scoringPeriodId", String(opts.scoringPeriodId));
  }

  const base = opts.historical
    ? `${HOST}/apis/v3/games/${GAME}/leagueHistory/${leagueId}?seasonId=${seasonYear}`
    : `${HOST}/apis/v3/games/${GAME}/seasons/${seasonYear}/segments/0/leagues/${leagueId}`;

  const query = params.toString();
  if (!query) return base;
  return base.includes("?") ? `${base}&${query}` : `${base}?${query}`;
}

export type EspnFetchResult<T> = { data: T; usedHistorical: boolean };

async function request<T>(url: string, auth: EspnAuth, signal?: AbortSignal): Promise<T> {
  const cookie = cookieHeader(auth);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
        // Without a browser-ish UA ESPN intermittently returns HTML.
        "user-agent":
          "Mozilla/5.0 (compatible; MuseumOfFantasySports/1.0; +https://github.com/huntershaps/fantasy_sports)",
        ...(cookie ? { cookie } : {}),
      },
      signal,
      cache: "no-store",
    });
  } catch (error) {
    throw new ProviderError(
      `Could not reach ESPN: ${error instanceof Error ? error.message : "network error"}`,
      undefined,
      true,
    );
  }

  if (response.status === 401) {
    throw new ProviderError(
      "ESPN rejected the request (401). This league or season is private — add your SWID and espn_s2 cookies.",
      401,
    );
  }
  if (response.status === 404) {
    throw new ProviderError(
      "ESPN has no league at that id for that season (404).",
      404,
    );
  }
  if (response.status === 429) {
    throw new ProviderError("ESPN rate-limited the request (429).", 429, true);
  }
  if (!response.ok) {
    throw new ProviderError(`ESPN returned ${response.status}.`, response.status, response.status >= 500);
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProviderError("ESPN returned a non-JSON response.");
  }
}

/**
 * Fetches a league payload, choosing the controller automatically.
 *
 * The current season is tried first; a 404 there means the season predates the
 * active one, so the historical controller is tried before giving up. That
 * ordering matters because ESPN answers 401 (not 404) for a private season
 * that does exist, and we want that error to surface rather than be masked.
 */
export async function fetchLeaguePayload<T>(
  leagueId: string,
  seasonYear: number,
  views: string[],
  auth: EspnAuth,
  options: { scoringPeriodId?: number; signal?: AbortSignal } = {},
): Promise<EspnFetchResult<T>> {
  const currentUrl = buildUrl(leagueId, seasonYear, {
    historical: false,
    views,
    scoringPeriodId: options.scoringPeriodId,
  });

  try {
    return { data: await request<T>(currentUrl, auth, options.signal), usedHistorical: false };
  } catch (error) {
    const notFound = error instanceof ProviderError && error.status === 404;
    if (!notFound) throw error;
  }

  const historyUrl = buildUrl(leagueId, seasonYear, {
    historical: true,
    views,
    scoringPeriodId: options.scoringPeriodId,
  });
  const payload = await request<T | T[]>(historyUrl, auth, options.signal);
  // The historical controller wraps its result in a single-element array.
  const unwrapped = (Array.isArray(payload) ? payload[0] : payload) as T | undefined;
  if (!unwrapped) {
    throw new ProviderError("ESPN returned an empty historical payload.", 404);
  }
  return { data: unwrapped, usedHistorical: true };
}
