/** Signs in, then requests every route and reports non-200 responses.
 *  Run against a live dev server: node scripts/smoke.mjs */
const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "hunter@sflinsider.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "museum2026!";

const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(response) {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function get(path, redirect = "manual") {
  const response = await fetch(`${BASE}${path}`, {
    headers: { cookie: cookieHeader() },
    redirect,
  });
  absorb(response);
  return response;
}

async function signIn() {
  const page = await get("/login");
  const html = await page.text();
  const csrfPage = await get("/api/auth/csrf");
  const { csrfToken } = await csrfPage.json();
  if (!csrfToken) throw new Error("no csrf token");

  const body = new URLSearchParams({
    email: EMAIL,
    password: PASSWORD,
    csrfToken,
    callbackUrl: `${BASE}/home`,
  });

  const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      cookie: cookieHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",
  });
  absorb(response);

  void html;
  if (!jar.has("authjs.session-token") && !jar.has("__Secure-authjs.session-token")) {
    throw new Error(`sign-in failed (status ${response.status})`);
  }
}

const ROUTES = [
  "/",
  "/home",
  "/leagues",
  "/league/the-aussie-grillers",
  "/league/the-aussie-grillers?season=2025",
  "/league/the-aussie-grillers/schedule?season=2025",
  "/league/the-aussie-grillers/standings?season=2025",
  "/teams",
  "/schedule",
  "/standings",
  "/memories",
  "/memories?filter=mine",
  "/memories?filter=TRADE",
  "/awards",
  "/awards?scope=mine",
  "/records",
  "/history",
  "/profile",
  "/search",
  "/search?q=Justin+Jefferson",
  "/admin",
  "/admin/leagues",
  "/admin/seasons",
  "/admin/users",
  "/admin/awards",
  "/admin/memories",
  "/admin/records",
  "/admin/data",
  "/admin/sync",
  "/admin/settings",
  "/forgot-password",
  "/signout",
];

await signIn();
console.log("signed in\n");

let failures = 0;
for (const route of ROUTES) {
  const response = await get(route, "follow");
  const ok = response.status === 200;
  if (!ok) failures++;
  console.log(`${ok ? "  ok " : "FAIL "} ${String(response.status).padEnd(4)} ${route}`);
}

// Detail routes need real ids, so discover them from a page that links to one.
const detailProbes = [
  ["/memories/", "/memories", /href="\/memories\/([^"?]+)"/],
  ["/awards/", "/awards", /href="\/awards\/([^"?]+)"/],
  ["/matchup/", "/league/the-aussie-grillers?season=2025", /href="\/matchup\/([^"?]+)"/],
  ["/profile/", "/admin/users", /href="\/profile\/([^"?]+)"/],
];

for (const [prefix, listing, pattern] of detailProbes) {
  const source = await (await get(listing, "follow")).text();
  const match = source.match(pattern);
  if (!match) {
    console.log(`  ??  no id found for ${prefix}`);
    continue;
  }
  const response = await get(`${prefix}${match[1]}`, "follow");
  const ok = response.status === 200;
  if (!ok) failures++;
  console.log(`${ok ? "  ok " : "FAIL "} ${String(response.status).padEnd(4)} ${prefix}${match[1]}`);
}

console.log(`\n${failures === 0 ? "all routes ok" : `${failures} failing route(s)`}`);
process.exitCode = failures === 0 ? 0 : 1;
