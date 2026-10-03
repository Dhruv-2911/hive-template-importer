# ADR-009: Sign-in with Supabase Auth, verified by the API

## Status
Accepted. Amends ADR-002 ("Supabase only as Postgres") and ADR-008 ("There's no login").

## Date
2026-10-03

## Context
- The owner decided (2026-10-03):
  - The **whole app** sits behind sign-in.
  - Everyone who signs in shares **one workspace**.
  - Sign-in is by **email and password**.
  - **Sign-up is open**, so Hive's reviewers can create their own accounts.
- The assignment allows a login if the README explains how to get in.
- The frontend is a static export with no Next.js server (ADR-008), and all data comes from FastAPI. Protecting the
  data means protecting the API. The HTML and JavaScript hold no data.
- The Supabase project signs access tokens with an asymmetric key (ES256, P-256) and publishes the public keys at
  `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (checked 2026-10-03). Verifying a token doesn't need a shared secret.
- The live Render instance is in Singapore and Supabase is in Mumbai, so every network round trip adds about 60 ms.

## Decision
- **The browser signs in with `@supabase/supabase-js`** (`signInWithPassword`, `signUp`, `signOut`) directly against
  Supabase Auth. The session is kept in `localStorage` (the library's default) and refreshed automatically.
- **Runtime config:** `GET /api/auth/config` returns `{supabase_url, supabase_publishable_key}`. Both are public by
  design. Serving them at runtime keeps one image for every environment (ADR-001), with no build-time variables.
- **The API checks every request.** Every `/api` route except `/api/health` and `/api/auth/config` needs
  `Authorization: Bearer <access token>`. FastAPI verifies the token locally with PyJWT:
  - the signature, against the project's key set (fetched once, then cached)
  - only the asymmetric algorithms ES256 and RS256 are accepted
  - it hasn't expired
  - `aud` is `authenticated`, and `iss` is `<SUPABASE_URL>/auth/v1`
  - `sub` is present
  - anonymous users are refused

  A missing or bad token gets `401 AUTH_REQUIRED` with `WWW-Authenticate: Bearer`.
- **The frontend guards every page except `/login/`.** With no session, it redirects to `/login/?next=<the page>`.
  `next` is only followed when it's a same-site path. A 401 from the API signs the browser out and returns it to the
  sign-in page.
- **One shared workspace:** no user columns and no schema change. Any signed-in user can read and change every template.
- **Database access is unchanged.** The app connects as the table owner through `DATABASE_URL`. The publishable key is
  now visible in the browser, so Supabase's Data API is reachable with it. But row-level security is on with no
  policies (ADR-002), so that API returns nothing.
- **Fail loudly:** `create_app` refuses to start without `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. On Render, a
  failed start keeps the previous deploy serving. `python -m app.seed` doesn't need them.
- **Tests:** a `SUPABASE_JWKS` setting supplies a fixed key set instead of fetching one. The backend tests generate a
  key pair per run. The e2e tests use a committed **test-only** key and a fake Supabase host, so no test talks to the
  real project. Production never sets `SUPABASE_JWKS`.

## Alternatives Considered

### Ask Supabase about every token (`GET /auth/v1/user`)
- Pros: it notices sign-outs immediately.
- Cons: a round trip to Mumbai on every API call, and the API goes down whenever Supabase Auth does.
- Rejected. Local verification against cached keys costs nothing per request.

### The legacy shared JWT secret (HS256)
- Cons: a shared secret in the app's environment, and this project already signs with an asymmetric key.
- Rejected.

### Cookie sessions through `@supabase/ssr` and Next.js middleware
- Cons: needs a Next.js server, which ADR-008 rules out.
- Rejected.

### Protect only changes, leave browsing public
- Offered to the owner, who chose to protect the whole app.

### Per-user templates
- Offered to the owner, who chose a shared workspace. It would need an owner column, a migration on the live database,
  and an ownership check in every query.

## Consequences
- **Reviewers create an account** on the sign-in page, and the README says so.
- **Supabase settings the owner sets:**
  - turn off *Confirm email* (otherwise the built-in mailer allows only a few sign-ups an hour)
  - set the *Site URL* to the Render URL, and add the local URLs as redirect URLs
- **Sign-out has a gap.** Signing out ends the browser's session, but an access token already issued stays valid until
  it expires (an hour by default). That's acceptable for a shared demo workspace.
- **Open sign-up** means anyone can create an account and change the shared templates, as anyone could before sign-in
  existed. Supabase rate-limits sign-ups.
- **Not built:** password reset, roles and per-user data. They're listed in NOTES.md.
- **The uptime monitor keeps working,** because `/api/health` stays public.
- **The "Download original file" link** can't send a header, so the frontend fetches the file with the token and saves
  it from memory.
