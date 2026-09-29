# ADR-001: Deploy as one Docker container on Render

## Status
Accepted

## Date
2026-09-28

## Context
- The assignment asks for a public URL deployed on Vercel: *"If your stack cannot reasonably run on Vercel, host it
  elsewhere and tell us where."*
- The stack is FastAPI (Python) plus Next.js (TypeScript). Both **can** run on Vercel, so hosting elsewhere is a
  deliberate deviation. We have to explain it, not claim it was necessary.
- Needs: one public URL, real persistence, migrations and seeding at deploy time, and a local environment that matches production.

## Decision
Build one multi-stage Docker image. The first stage builds the Next.js static export (ADR-008). The second is a Python
3.12 image that runs FastAPI and serves those static files. Deploy it as a Render web service on the Docker runtime.
The container start command is:

```
alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

An external uptime monitor requests `/api/health` every 5 minutes so the free instance doesn't go to sleep.

## Alternatives Considered

### Everything on Vercel (Next.js + FastAPI as a Python function)
- Pros: meets the stated requirement literally, and there's no sleep.
- Cons: the API runs as serverless functions, with cold starts per instance and a new database connection per instance
  (which forces the transaction-mode pooler and disabling psycopg prepared statements). Migrations and seeding need a
  step outside the request path. Local development differs from production.
- Rejected: the owner prefers a single artifact that runs identically with `docker run` and in production.

### Next.js on Vercel, FastAPI container on Render
- Pros: reviewers still get a Vercel URL.
- Cons: two deploys, two URLs, CORS, environment variables kept in sync across two platforms, and the API still sleeps.
- Rejected: more moving parts with no benefit for a single-user demo.

### Next.js Node server and FastAPI together in one container
- See ADR-008.

## Consequences
- **README and NOTES.md must say the app is hosted on Render and why**, because the assignment asks us to tell them where.
- The image that runs locally is the image that runs in production; only `DATABASE_URL` differs.
- Render's free tier sleeps after about 15 minutes without traffic. The external uptime monitor prevents that, and one
  always-on service fits within the free monthly instance hours.
- Render's filesystem is ephemeral, so nothing is written to disk. Uploaded files are stored in Postgres (ADR-004).
- Migrations run on every start, so they must be safe to re-run. Seeding runs on every start, so it must be idempotent.
