# ADR-002: Supabase Postgres through the session pooler

## Status
Accepted

## Date
2026-09-28

## Context
- We need a real Postgres database that the Render container can reach (ADR-001). The assignment encourages Supabase.
- We use Supabase **only as Postgres**: no supabase-js, Supabase Auth or Storage. The app connects with SQLAlchemy through a `DATABASE_URL`.
- Supabase's direct connection host is IPv6-only unless you buy the IPv4 add-on. Render services can't reliably
  reach IPv6-only hosts. Supabase's Supavisor pooler is reachable over IPv4 in two modes: session (port 5432) and
  transaction (port 6543).
- The app is one long-running process, not serverless functions.

## Decision
- `DATABASE_URL` is the Supabase **session pooler** connection string
  (`postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres?sslmode=require`).
- SQLAlchemy uses a small pool (`pool_size=5`, `pool_pre_ping=True`). Alembic migrates over the same URL.
- Migrations enable row-level security on every app table and add no policies (explained under Consequences).
- `/api/health` runs `SELECT 1`.

## Alternatives Considered

### Transaction pooler (port 6543)
- Pros: built for many short-lived serverless connections.
- Cons: breaks psycopg's automatic prepared statements and session-level features. We gain nothing from it with one long-running process.
- Rejected.

### Direct connection
- Cons: IPv6-only, so it can't be reached from Render without a paid add-on.
- Rejected.

### Neon
- Pros: equally good plain Postgres.
- Rejected only because the assignment names Supabase as encouraged. Switching later means changing `DATABASE_URL` and nothing else.

### Render Postgres
- Pros: same platform, private networking.
- Cons: free instances expire after a fixed period.
- Rejected.

## Consequences
- The app works with any Postgres: docker compose Postgres 16 locally and in tests, Supabase in production.
- Supabase automatically exposes tables in the `public` schema through its Data API. RLS with no policies blocks that
  API, while the app, which connects as the table owner, is unaffected.
- Supabase pauses free projects after a period of inactivity. Because `/api/health` touches the database, the uptime
  monitor's pings keep the project active.
- Credentials live only in Render's environment settings and a local `.env` (gitignored). `.env.example` documents the format.
- Verify on the first deploy that the pooler URL connects from Render before building anything else on top of it.
