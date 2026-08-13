# Deploying to huntermshaps.com/fantasy

The app is served from a sub-path of the portfolio domain rather than a domain
of its own. Two Netlify sites are involved:

| Site           | Repo                     | Serves                                  |
| -------------- | ------------------------ | --------------------------------------- |
| Portfolio      | `huntershaps/portfolio`  | `huntermshaps.com` — static files        |
| Fantasy museum | `huntershaps/fantasy_sports` | the Next.js app, built at `/fantasy` |

The portfolio's `netlify.toml` proxies `/fantasy/*` to the fantasy site with a
`200` (rewrite, not redirect), so the browser's address bar never leaves
`huntermshaps.com`. That matters for more than looks: it is what keeps the
Auth.js session cookie on the portfolio's own origin.

## What is already done in code

- `next.config.ts` sets `basePath: "/fantasy"`.
- `src/lib/paths.ts` holds `BASE_PATH` / `withBase()` for the places Next does
  **not** prefix automatically.
- `src/proxy.ts` normalises the incoming path and builds redirect targets with
  `withBase()`.
- `src/auth.config.ts` deliberately leaves Auth.js on its default `/api/auth`.

Two behaviours here were verified against a running build rather than assumed,
because both are easy to get backwards:

1. **`redirect()` from `next/navigation` does not apply basePath.** Targets
   have to be written as `withBase("/login")`.
2. **Route handlers receive the path with basePath already stripped.** Auth.js
   must therefore keep its default `basePath` of `/api/auth`; setting it to
   `/fantasy/api/auth` produces `UnknownAction: Cannot parse action`. The
   external prefix is communicated through `AUTH_URL` instead.

## Steps you need to do

These need your accounts, so I cannot do them.

### 1. Create the database on Neon

1. Create a project at <https://neon.tech>.
2. Copy the pooled connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/DB?sslmode=require
   ```

Prisma 7 with `@prisma/adapter-pg` — which this project already uses — works
with Neon's pooled endpoint directly, so no extra driver is needed.

Apply the schema from your machine, with `DATABASE_URL` set to the Neon string
for the duration of the command only:

```bash
DATABASE_URL="<neon-connection-string>" pnpm prisma migrate deploy
```

Do **not** run `pnpm db:seed` against Neon. That seeds generated development
data, and this database is meant to hold real league history.

### 2. Deploy the fantasy app

Create a Netlify site from `huntershaps/fantasy_sports`. `netlify.toml` already
sets the build command and the Next runtime plugin. Set these environment
variables in the Netlify UI:

| Variable                    | Value                                            |
| --------------------------- | ------------------------------------------------ |
| `DATABASE_URL`              | the Neon connection string                        |
| `AUTH_SECRET`               | `node scripts/gen-secrets.mjs` output             |
| `AUTH_URL`                  | `https://huntermshaps.com/fantasy/api/auth`       |
| `AUTH_TRUST_HOST`           | `true`                                            |
| `CREDENTIAL_ENCRYPTION_KEY` | from `gen-secrets.mjs`                            |

`AUTH_URL` and `AUTH_TRUST_HOST` are both required: the app sees Netlify's
internal host through the proxy, and without these Auth.js builds callback URLs
against that internal host instead of your domain.

Leave `ESPN_*` and `YAHOO_*` unset until you have those credentials — the app
runs without them, it just has nothing to import.

Note the site's own `*.netlify.app` URL once it deploys.

### 3. Point the portfolio at it

In `portfolio/netlify.toml`, replace `fantasy-sports-museum.netlify.app` with
the URL from step 2, in both redirect blocks. Then deploy the portfolio site
and attach `huntermshaps.com` to it.

### 4. Make yourself the first Super Admin

Registration always creates a plain `USER`, and only a `SUPER_ADMIN` can change
roles from `/admin/users`. A fresh database therefore has no admin at all —
the seed grants it in development, but the seed must never be run against real
data. Bootstrap it by hand instead:

1. **Register through the UI** at `https://huntermshaps.com/fantasy/register`.
   Do this the moment the site is live. There is no email verification, so the
   address is claimed first-come, and this repository is public.
2. **Grant the role**, pointing `DATABASE_URL` at Neon for the one command:

   ```bash
   DATABASE_URL="<neon-url>" pnpm exec tsx scripts/grant-role.mts
   ```

   It defaults to `hunter@sflinsider.com` and `SUPER_ADMIN`; both can be passed
   as arguments. It only ever promotes an account that already exists — it
   never creates one, so no password passes through a terminal.

From then on every other role change happens in `/admin/users`.

### Forgotten passwords, with no mail transport

Nothing is wired up to send email yet, so the in-app "forgot password" flow can
create a token but cannot deliver it. The page says so rather than claiming a
message is on its way. To get a link, an operator mints one:

```bash
BASE_URL=https://huntermshaps.com DATABASE_URL="<neon-url>" pnpm exec tsx scripts/reset-link.mts <email>
```

It prints a single-use link valid for one hour and invalidates any earlier
ones. Open it and choose a password in the app. Treat the link as a sign-in:
anyone holding it can set that account's password.

Wiring up real email later means setting `RESEND_API_KEY` or `SMTP_HOST` and
sending the link from `requestPasswordReset`. The UI already switches its copy
based on whether either is present.

### 5. Check it end to end

```bash
curl -sI https://huntermshaps.com/fantasy/login | head -1
curl -s  https://huntermshaps.com/fantasy/api/auth/csrf
```

The first should be `200`, the second a JSON object containing `csrfToken`. If
the CSRF call returns `400`, `AUTH_URL` is wrong. Then register an account
through the UI and confirm you stay signed in across a page load — that is the
real test of whether cookies survive the proxy.

## Known risk

Proxying an App Router app through Netlify's rewrite is the least certain part
of this setup. Netlify's proxy has a request timeout and does not stream
responses as well as a direct deployment, so heavy React Server Component
streaming may feel slower than it does on the app's own URL.

If that becomes a problem, the fallback is to serve the app from a subdomain
(`fantasy.huntermshaps.com`) instead. That is a DNS change plus updating
`AUTH_URL` — `basePath` can stay, or be dropped, without touching app code
beyond `src/lib/paths.ts`. It costs nothing extra: a subdomain is not a second
domain purchase.
