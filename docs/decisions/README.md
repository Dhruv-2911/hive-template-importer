# Architecture decisions

Why the project is built the way it is. Don't re-decide something recorded here. If a decision changes, write a new
ADR that supersedes the old one, and never delete old ADRs.

| ADR | Decision | Status |
|---|---|---|
| [001](ADR-001-single-container-on-render.md) | One Docker container on Render, not Vercel (a deliberate deviation that we explain) | Accepted |
| [002](ADR-002-supabase-postgres-session-pooler.md) | Supabase Postgres through the session pooler; RLS on with no policies | Accepted; amended by 009 |
| [003](ADR-003-deterministic-importer-no-llm.md) | Deterministic importer, with no LLM in the import path | Accepted |
| [004](ADR-004-lossless-relational-storage.md) | Relational tree plus an unchangeable source copy; comments identified by source row | Accepted |
| [005](ADR-005-content-encoding-and-sanitizing.md) | Decode names once, keep comment HTML exactly as exported, sanitize when rendering | Accepted |
| [006](ADR-006-verifiable-import-report.md) | Improvement: an import report with round-trip verification inside the transaction | Accepted |
| [007](ADR-007-editor-v1-scope.md) | Editor v1: rename and edit text only; never rewrite comments the user didn't touch | Accepted |
| [008](ADR-008-nextjs-static-export-served-by-fastapi.md) | Next.js static export served by FastAPI from one origin | Accepted; amended by 009 |
| [009](ADR-009-supabase-auth-sign-in.md) | Sign-in with Supabase Auth; the API verifies access tokens against the project's published keys | Accepted |
