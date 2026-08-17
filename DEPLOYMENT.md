# Deploying the app under the portfolio domain

The app is served from a sub-path of the portfolio domain rather than a domain
of its own. Two Netlify sites are involved:

| Site           | Repo                     | Serves                                  |
| -------------- | ------------------------ | --------------------------------------- |
| Portfolio      | `huntershaps/portfolio`  | `huntershaps.netlify.app` — static files |
| Fantasy museum | `huntershaps/fantasy_sports` | the Next.js app, built at `/fantasy` |

`huntermshaps.com` currently **redirects** to `huntershaps.netlify.app` rather
than serving it, so the origin a browser ends up on — and therefore the origin
that matters for cookies and for `allowedOrigins` — is the `netlify.app` one.
Both are configured, so promoting `huntermshaps.com` to the primary domain in
Netlify later will not break anything.

The portfolio's `netlify.toml` proxies `/fantasy/*` to the fantasy site with a
`200` (rewrite, not redirect), so the browser's address bar never leaves the
portfolio's origin. That matters for more than looks: it is what keeps the
Auth.js session cookie on a single origin.

## What is already done in code

- `next.config.ts` sets `basePath: "/fantasy"`.
- `src/lib/paths.ts` holds `BASE_PATH` / `withBase()` for the places Next does
  **not** prefix automatically.
- `src/proxy.ts` normalises the incoming path and builds redirect targets with
  `withBase()`.
- `src/auth.config.ts` deliberately leaves Auth.js on its default `/api/auth`.

These were verified against a running build. The first one I originally had
backwards, and it cost a broken Schedule and Standings page:

1. **`redirect()` DOES apply basePath.** A probe route returned
   `Location: /fantasy/leagues` for `redirect("/leagues")`, and
   `/fantasy/fantasy/leagues` when the target was prefixed by hand. Pass it
   plain paths. The same is true of `next/link`, `next/image` and the router.
2. **`withBase()` is only for what nothing else prefixes**: `proxy.ts`, which
   runs before basePath is stripped; Auth.js `pages` and `redirectTo`, which
   Auth.js resolves against its own base URL; raw `<form action>` strings; and
   URLs that leave the app entirely, like emails.
3. **Route handlers receive the path with basePath already stripped.** Auth.js
   must therefore keep its default `basePath` of `/api/auth`; setting it to
   `/fantasy/api/auth` produces `UnknownAction: Cannot parse action`. The
   external origin comes from the forwarded host via `AUTH_TRUST_HOST`, not
   from `AUTH_URL` — see below.

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
| `AUTH_TRUST_HOST`           | `true`                                            |
| `CREDENTIAL_ENCRYPTION_KEY` | from `gen-secrets.mjs`                            |
| `PUBLIC_ORIGIN`             | `huntershaps.netlify.app` — host only, no scheme  |

Do **not** set `AUTH_URL`. `AUTH_TRUST_HOST=true` is what makes Auth.js trust
the forwarded host, which is the correct arrangement behind a proxy; `AUTH_URL`
only contradicts it. See "Do not set AUTH_URL" below for what that breaks.

Leave `ESPN_*` and `YAHOO_*` unset until you have those credentials — the app
runs without them, it just has nothing to import.

Note the site's own `*.netlify.app` URL once it deploys.

### 3. Point the portfolio at it

In `portfolio/netlify.toml`, replace `fantasy-sports-museum.netlify.app` with
the URL from step 2, in **both** redirect blocks. That host is a placeholder
and does not exist, so until it is replaced `/fantasy` serves a Netlify error
page rather than the app. Netlify does not interpolate environment variables
into `netlify.toml` redirects, so this cannot be supplied as a build variable —
it has to be edited in the file.

Then deploy the portfolio site. `huntermshaps.com` currently redirects to
`huntershaps.netlify.app`; either is fine, since both are already in
`allowedOrigins`. Promoting `huntermshaps.com` to the primary domain in
Netlify's UI is a settings change, not a code one.

### 4. Make yourself the first Super Admin

**Already done if the database was seeded by `copy-db.mts`.** That copies the
`User` table, so the existing account — role and password hash included — is
already in Neon. Sign in with the password you already use; there is nothing to
register and no role to grant.

Verify with:

```bash
DATABASE_URL="<neon-url>" pnpm exec tsx scripts/grant-role.mts
```

It reports `already SUPER_ADMIN` and changes nothing when the role is set.

For a genuinely fresh database, the bootstrap matters, because registration
always creates a plain `USER` and only a `SUPER_ADMIN` can change roles from
`/admin/users` — so nobody could ever become the first one:

1. **Register through the UI** at `https://huntershaps.netlify.app/fantasy/register`.
   There is no email verification, so the address is claimed first-come.
2. **Grant the role** with the command above. It only ever promotes an account
   that already exists — it never creates one, so no password passes through a
   terminal.

From then on every other role change happens in `/admin/users`.

### Forgotten passwords, with no mail transport

Nothing is wired up to send email yet, so the in-app "forgot password" flow can
create a token but cannot deliver it. The page says so rather than claiming a
message is on its way. To get a link, an operator mints one:

```bash
BASE_URL=https://huntershaps.netlify.app DATABASE_URL="<neon-url>" pnpm exec tsx scripts/reset-link.mts <email>
```

It prints a single-use link valid for one hour and invalidates any earlier
ones. Open it and choose a password in the app. Treat the link as a sign-in:
anyone holding it can set that account's password.

Wiring up real email later means setting `RESEND_API_KEY` or `SMTP_HOST` and
sending the link from `requestPasswordReset`. The UI already switches its copy
based on whether either is present.

### 5. Check it end to end

```bash
curl -sI https://huntershaps.netlify.app/fantasy/login | head -1
curl -s  https://huntershaps.netlify.app/fantasy/api/auth/csrf
```

The first should be `200`, the second a JSON object containing `csrfToken`. A
`400 Bad request.` from the CSRF call means `AUTH_URL` is set — unset it. Then register an account
through the UI and confirm you stay signed in across a page load — that is the
real test of whether cookies survive the proxy.

## Do not set AUTH_URL

Setting it produced `400 Bad request.` from every auth endpoint, including
`/fantasy/api/auth/csrf`, on the deployed site — while the same value worked
locally.

The path was not the problem. The host was: `AUTH_URL` named the public origin,
but the app is served as `fantasy-sports-museum.netlify.app` behind a proxy, and
Auth.js rejects a request whose host does not match the one it was given.

`AUTH_TRUST_HOST=true` already tells Auth.js to trust the forwarded host, which
is the correct arrangement behind a proxy. `AUTH_URL` then only contradicts it.
Leave it unset and let the forwarded host win.

## Server Actions and the proxy

Next 16 rejects a Server Action whose `Origin` does not match the host it sees,
as CSRF protection. Behind a proxy those never match — the browser sends
`huntermshaps.com`, the app sees its own Netlify host — so **every form on the
site fails with `Invalid Server Actions request`**: login, register, password
reset, admin role changes.

`serverActions.allowedOrigins` in `next.config.ts` fixes it, and
`PUBLIC_ORIGIN` overrides the list without a code change. Getting it wrong
breaks every form, so if forms 500 in production after a domain change, check
this first.

The protection still works: an action arriving from an origin outside the list
is rejected exactly as before. The list only widens it to the domain the app is
legitimately served from.

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
