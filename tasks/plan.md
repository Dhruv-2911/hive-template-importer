# Implementation Plan: Spectora template importer

**Status: APPROVED 2026-09-29.**
Source of truth: `SPEC.md` (approved 2026-09-28) and `docs/decisions/` (ADR-001 to 008). The task list is in `tasks/todo.md`.

## Overview
A FastAPI + Next.js app, packaged as one Docker container on Render and backed by Supabase Postgres. It imports a
Spectora HTML-text export into a relational template, proves the import is complete with a report checked inside the
import transaction, lets the inspector rename items and edit comment text without rewriting anything they didn't touch,
and duplicates templates independently.

## Architecture decisions (details in the ADRs)
- One container on Render; the external uptime monitor pings `/api/health` (ADR-001).
- Supabase through the session pooler; RLS on with no policies; `/api/health` runs `SELECT 1` (ADR-002).
- A deterministic parser that is pure (no DB or I/O) and tested against both committed exports (ADR-003).
- A relational tree, comments identified by `source_row`, plus unchangeable `source_*` fields and all 42 raw cells (ADR-004).
- Names decoded once; comment HTML kept exactly as exported; DOMPurify when rendering and nh3 when saving, sharing one allowlist (ADR-005).
- The improvement is the verifiable import report; a verification mismatch rolls the import back (ADR-006).
- Editor v1 renames and edits text only; comments are sent to the server only when changed; HTML mode as a fallback (ADR-007).
- Next.js static export with `trailingSlash: true`, served by FastAPI from one origin (ADR-008).

## Dependency graph

```
T1 backend skeleton ──┬── T2 frontend skeleton + Dockerfile ── T3 deploy skeleton (Render + Supabase)
                      │                                              │
T4 importer: read/detect/failures (pure) ── T5 parse + golden ── T6 report notices + variants
                      │                                              │
                      └──────────── T7 schema + import API + in-transaction verify ─┘
                                           │
                            T8 seed + template read API
                                           │
                            T9 browse UI (tree, comments, sanitized render)
                                  │                 │                │
                   T10 upload + report UI   T11 rename slice   T13 duplicate slice
                                                    │
                                           T12 comment text editor (TipTap)
                                           │
                     T14 e2e ── T15 live verification ── T16 README/NOTES/prompts ── T17 walkthrough outline
```

The importer tasks (T4–T6) are pure and don't depend on T1–T3, so they can run in parallel with the infrastructure work.

## Phases

1. **Fail fast on infrastructure and the importer (T1–T6).** A skeleton deployed to Render that reaches Supabase
   proves the riskiest assumption (pooler connectivity, static export served by FastAPI) on day one. The pure importer,
   passing golden tests on both files, proves the core value before any UI exists.
2. **Baseline vertical slices (T7–T13).** Import to DB → seed → browse → upload and report → rename → edit text → duplicate.
   The app stays deployable after every task.
3. **Prove it and ship it (T14–T17).** E2E against the container, the checklist against the live URL, the deliverable docs, and the video outline.

## Parallelization
- **Safe to run in parallel:** T4–T6 alongside T1–T3. T10, T11 and T13 once T9 is done. T16 drafting alongside Phase 2.
  The human tasks (H1–H4) run alongside everything.
- **Must run in order:** T7 (first migration) before any other DB task; later migrations are serialized.
- **Needs a contract first:** T8 fixes the tree response schema that T9–T13 use; regenerate TS types (`npm run gen:api`) after any schema change.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The Supabase pooler can't be reached from Render (IPv6, SSL, credentials) | High | T3 deploys the skeleton before anything depends on it. Fallback: a Neon URL, with no code change |
| TipTap rewrites HTML (drops the embed `<div>`, `target`, whitespace) | Med | Comments sent only when changed, an allowlist check that routes to HTML mode, a test that open-and-close sends no request (T12) |
| Static-export routes return 404 in the container but work in `next dev` | Med | `trailingSlash: true`; T2 and T14 test inside the container, not only in dev |
| A reviewer's export has different xlsx internals (inline or shared strings, extra sheets) | Med | T6 variant fixtures cover these; the profiler on any new file |
| Reviewers' edits clutter the seeded sample | Low | Seed is idempotent on `is_sample`; see Open Question 3 |
| The deadline (21 Sept) has passed | High | H1: ask Hive for an extension now |
| Running out of time | Med | Cut in this order (all documented in NOTES.md): T14 e2e → a manual checklist recorded in the video; `/api/imports/{id}/file` download; sanitizer parity test → a shared fixture list only; `UNMODELLED_VALUE` notice. **Never cut:** the baseline, golden tests, failure codes, round-trip verification |

## Definition of Done (every task)
- The acceptance criteria in `tasks/todo.md` are met, with verification commands run and passing.
- `uv run pytest -q` passes, plus `npm run lint && npm run typecheck` if the frontend was touched.
- The import invariants in `CLAUDE.md` hold. Both golden tests still pass if the importer was touched.
- No secrets committed. `SPEC.md` or an ADR was updated first if behaviour differs from them.
- Committed as one focused commit (once commits are authorized; see Open Question 1).

## Open questions
1. ~~Git~~: resolved 2026-09-29. Repo initialized on `main`; one commit per task that passes verification. Not pushed.
2. ~~GitHub remote~~: resolved 2026-09-29. Private repo `Dhruv-2911/hive-template-importer`. Hive's reviewers must be
   added as collaborators before submission (usernames still needed).
3. ~~Sample reset~~: resolved 2026-09-29. Added to SPEC.md US7 as an operator-only command; built in T8.
