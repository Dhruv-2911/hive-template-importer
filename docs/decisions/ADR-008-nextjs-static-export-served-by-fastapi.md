# ADR-008: Next.js static export, served by FastAPI

## Status
Accepted. Amended 2026-10-03 by [ADR-009](ADR-009-supabase-auth-sign-in.md): there is now a sign-in, handled in the
browser by supabase-js and checked by the API.

## Date
2026-09-28

## Context
- There is one container (ADR-001). Next.js can run either as a Node server (server rendering, API routes) or as a
  static export.
- The UI is a client application that calls FastAPI. There's no login, search indexing requirement or server-rendered data.

## Decision
- Next.js is built with `output: 'export'` and `trailingSlash: true`.
- FastAPI registers its `/api` routers first, then mounts `frontend/out` at `/` with `StaticFiles(html=True)`.
- Pages that need an id take it as a query parameter (`/template/?id=…`), because a static export can't pre-render ids
  it doesn't know at build time.
- The frontend and API share one origin, so production needs no CORS and `NEXT_PUBLIC_API_BASE` is empty.

## Alternatives Considered

### Next.js standalone Node server plus uvicorn in one container
- Cons: two processes, a supervisor, and a proxy between them. More things to break for no user-visible gain.
- Rejected.

### A separate frontend service
- Cons: two deploys (see ADR-001).
- Rejected.

### Vite + React single-page app
- Pros: the same result with less framework.
- Rejected because the owner chose Next.js.

## Consequences
- No Next.js server features: no server components that fetch data, server actions, API routes or middleware. All data
  comes from FastAPI through TanStack Query.
- `trailingSlash: true` makes the export write `template/index.html`, which `StaticFiles(html=True)` serves at
  `/template/`. Without it, `/template` works in `next dev` but returns 404 in the container, so test this in the container, not only in dev.
- `StaticFiles(html=True)` serves Next's `404.html` for unknown paths.
- Node is only needed in the build stage, so the final image contains a single runtime (Python).
