# Spectora template importer

Imports a Spectora template export (*Export to spreadsheet → Export HTML Text*), proves every comment arrived
intact, and lets an inspector rename, edit, search and duplicate the template. Built for the Hive Inspect Forward
Deployed Engineer take-home.

**Live app:** https://hive-template-importer-f6w9.onrender.com

**Getting in:** choose **Create an account** on the sign-in page, and enter any email address and a password of at
least 6 characters. Sign-up is open and you're signed in straight away. After that, the app opens on the overview of
an imported sample template. Everyone who signs in shares one workspace, so you'll also see templates other reviewers
imported ([ADR-009](docs/decisions/ADR-009-supabase-auth-sign-in.md)).

**Hosted on Render, not Vercel.** The stack (FastAPI + Next.js) could run on Vercel. I chose one Docker image instead,
so the app runs the same way locally and in production, with migrations and seeding at start-up and one persistent
database connection pool instead of serverless functions. The reasoning and the trade-offs are in
[ADR-001](docs/decisions/ADR-001-single-container-on-render.md). The database is Supabase Postgres, reached through
its session pooler ([ADR-002](docs/decisions/ADR-002-supabase-postgres-session-pooler.md)).

Start with [NOTES.md](NOTES.md) for what was built, what was cut, the limits and how it was checked.

## Run it locally

You need Docker, Python 3.12 with [uv](https://docs.astral.sh/uv/), Node 22, and a Supabase project for sign-in
(the free tier is enough). Its URL and publishable key are under **Project Settings → API Keys**. They're public
values, and the live app serves its own at `/api/auth/config`.

```bash
# 1. Database: Postgres 17 on port 5433, with separate test databases.
docker compose up -d --wait db

# 2. Backend: install, configure, create the schema, import the sample, start the API on :8000.
cd backend
uv sync
cp ../.env.example .env.local          # then fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:create_app --factory --reload --port 8000

# 3. Frontend, in another terminal: http://localhost:3000
cd frontend
npm ci
NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev
```

**Or run it exactly as production does**, as one container serving the API and the built frontend on :8000:

```bash
docker build -t hive-importer .
docker run --rm -p 8000:8000 --network hive_default \
  -e DATABASE_URL=postgresql://hive:hive@db:5432/hive \
  -e SUPABASE_URL=https://<project-ref>.supabase.co -e SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
  hive-importer
```

The container runs `alembic upgrade head`, then `python -m app.seed`, then uvicorn. Both steps before uvicorn are safe
to repeat on every start.

## Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | Postgres URL. Production uses the Supabase **session pooler** URI with `?sslmode=require`. |
| `SUPABASE_URL` | yes (web app) | The Supabase project URL, for sign-in. The API checks tokens against its published keys. |
| `SUPABASE_PUBLISHABLE_KEY` | yes (web app) | The project's publishable key, handed to the browser for sign-in. Public by design. |
| `PORT` | on Render | Port to listen on; Render sets it. The image defaults to 8000. |
| `MAX_UPLOAD_MB` | no | Largest upload accepted. Default 10. |
| `CORS_ORIGINS` | dev only | Comma-separated origins allowed to call the API (`http://localhost:3000` for `next dev`). |
| `NEXT_PUBLIC_API_BASE` | dev only | Where the frontend finds the API at build time. Empty in production (same origin). |
| `SUPABASE_JWKS` | tests only | A fixed key set the API trusts instead of the project's. The e2e suite uses it with a test-only key. Never set it in production. |

Credentials are never committed. `backend/.env.local` and `.env` are gitignored, and `.env.example` documents the
format.

## Commands

| Where | Command | What it does |
|---|---|---|
| `backend/` | `uv run pytest -q` | 169 tests: importer, API, sign-in checks, migrations and RLS, seed (needs the compose database) |
| `backend/` | `uv run pytest --cov=app/importer --cov-fail-under=90` | Importer coverage gate |
| `backend/` | `uv run ruff check . && uv run ruff format --check .` | Lint and format |
| `backend/` | `uv run python -m app.seed --reset` | Operator only: replace the sample with a fresh import (copies and other templates are kept) |
| `frontend/` | `npm run lint && npm run typecheck` | ESLint and TypeScript |
| `frontend/` | `npm run e2e` | Builds the Docker image and runs 46 Playwright tests against it, on a fresh `hive_e2e` database. Tests sign in with tokens they mint; Supabase is mocked |
| `frontend/` | `npm run gen:api` | Regenerates the TypeScript API types from FastAPI's OpenAPI schema (no server needed) |
| repo root | `python scripts/profile_export.py "<export.xls>"` | Profiles any Spectora export: columns, hierarchy, escaping, rich content |

## Deploy (Render + Supabase)

1. **Supabase:** create a project. In **Connect → Session pooler**, copy the URI and add `?sslmode=require`. Don't use
   the direct connection (`db.<project-ref>.supabase.co`): it has only IPv6 addresses, Render can't reach it, and
   `/api/health` returns 503.
2. **Supabase sign-in:**
   - In **Authentication → Sign In / Providers → Email**, keep Email on and turn **Confirm email** off, so new accounts
     can get in at once. Supabase's built-in mailer sends only a few emails an hour.
   - In **Authentication → URL Configuration**, set the **Site URL** to the Render URL, and add `http://localhost:3000/**`
     and `http://localhost:8000/**` as redirect URLs.
3. **Render:** New → Blueprint → this repository (`render.yaml`). Enter `DATABASE_URL`, `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` when prompted. The app refuses to start without the last two. Pick the region closest
   to the database; the live app runs in Singapore against Supabase `ap-south-1` (Mumbai).
4. **Uptime monitor:** request `/api/health` every 10 minutes. It stays public, and it runs `SELECT 1`, so it keeps both
   the free Render instance and the free Supabase project awake.
5. Check:
   - `curl https://<app>.onrender.com/api/health` returns `{"status":"ok"}`.
   - `curl https://<app>.onrender.com/api/templates` returns 401.

## How it fits together

```
Browser ── Next.js static export (frontend/out) ──┐
                                                  ├─ FastAPI, one origin, one container (ADR-001, ADR-008)
           /api/* ── import pipeline (pure) ───────┤
                     services: save + verify,     └─ Postgres: import_runs → templates → sections → items → comments
                     duplicate, edits                 every source cell kept; source_* values never change (ADR-004)
```

- `backend/app/importer/`: a **pure** importer (bytes in; template draft and report out; no database). It detects the
  real file type, reads every column, builds the tree in file order, and records every decision as a notice
  ([ADR-003](docs/decisions/ADR-003-deterministic-importer-no-llm.md)).
- `backend/app/services/imports.py`: saves the tree, **reads it back inside the same transaction** and compares every
  field with the file, then commits or rolls back ([ADR-006](docs/decisions/ADR-006-verifiable-import-report.md)).
- `backend/app/auth.py`: checks the Supabase access token on every data route, against the project's published keys
  ([ADR-009](docs/decisions/ADR-009-supabase-auth-sign-in.md)).
- `frontend/`:
  - sign-in (supabase-js)
  - the templates list, upload and import report
  - the template page: overview, sections, search, and the editor for renames and comment text
    ([ADR-007](docs/decisions/ADR-007-editor-v1-scope.md))
  - laid out like Hive's own template screen ([design](docs/design.md))
- `docs/`: [requirements](docs/requirements.md), [measured export format](docs/spectora-export-format.md) and
  [architecture decisions](docs/decisions/README.md). [`SPEC.md`](SPEC.md) and [`tasks/`](tasks/) hold the spec and the
  plan the build followed.
- The committed exports `InterNACHI Commercial Template-2026-09-28.xls` (seeds the app) and
  `InterNACHI Residential -2026-09-28.xls` (a second file to prove generality) are stock Spectora library templates with
  no customer data.
