# The Museum of Fantasy Sports

A league history and awards platform for fantasy football. Every championship,
every blowout, every trade nobody has forgiven — kept permanently and served
back on the anniversary of the day it happened.

## Architecture

The frontend never talks to ESPN or Yahoo. Data flows one way:

```
External platform → FantasyProvider → normalization → database
                  → historical event engine → records / awards / memories
                  → personalized UI
```

Two invariants shape the schema:

1. **History is append-safe.** Mutable rows carry `source` and `lockedFields`,
   and every provider-sourced row has a natural key, so re-importing a season
   updates in place instead of destroying manual corrections.
2. **A person is not their team.** `User → TeamMembership → FantasyTeam →
   Franchise` keeps a manager's identity separate from whatever they named the
   team that year, which is what makes career history traversable.

Memories store `template` + `data` plus a `MemorySubject` join rather than
finished prose, so one row renders as "You beat Noah" or "Noah beat you"
depending on who is reading it.

Records keep their full lineage via `previousRecordId`, so the app can say a
mark stood for three years before it fell.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Prisma 7 · PostgreSQL ·
Auth.js v5 · Motion · Recharts

## Local setup

Requires Node 22+, pnpm, and PostgreSQL 17 on `localhost:5432`.

```bash
pnpm install
```

Copy the environment template and generate secrets:

```bash
cp .env.example .env && node scripts/gen-secrets.mjs
```

Create the database and apply migrations:

```bash
createdb -U postgres fantasy_sports && pnpm db:migrate
```

Seed development data and run the event engine over it:

```bash
pnpm db:seed
```

Start the dev server:

```bash
pnpm dev
```

Sign in with `hunter@sflinsider.com` / `museum2026!`.

> **The seeded leagues are fictional.** They exist so the UI can be built and
> tested against realistic shapes. They are dev-database only, never committed,
> and get wiped when real league data is imported.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Reset and regenerate development data |
| `pnpm db:studio` | Prisma Studio |
| `node scripts/smoke.mjs` | Sign in and request every route, reporting non-200s |

`smoke.mjs` needs a running dev server. It exists because manual spot-checks
missed 500s on three pages that it caught immediately.

## Connecting real leagues

Not wired up yet. When it is:

- **ESPN** — public leagues need only the league id. Private leagues and prior
  seasons also need the `SWID` and `espn_s2` cookies from a signed-in browser
  session.
- **Yahoo** — requires an app registered at developer.yahoo.com and a one-time
  OAuth2 authorization, even for public leagues.

Credentials are stored encrypted with `CREDENTIAL_ENCRYPTION_KEY` and never
sent to the browser.

## Not yet built

- ESPN and Yahoo provider implementations and the sync pipeline
- Mail transport for password reset (tokens work; delivery does not)
- Admin create/edit forms for leagues, seasons, and manual awards
