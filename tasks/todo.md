# Task list: Spectora template importer

The plan is in `tasks/plan.md` and the spec is `SPEC.md`. Sizes: S = 1–2 files, M = 3–5 hand-written files (generated
scaffolding not counted). Every task also has to meet the Definition of Done in `tasks/plan.md`.

## Phase 1: Fail fast on infrastructure and the importer

- [x] **T1: Backend skeleton + local Postgres** (S–M)
  - Acceptance: `uv sync` works; `GET /api/health` returns `{"status":"ok"}` after running `SELECT 1` against the DB; a
    DB outage returns 503; settings come from env (`DATABASE_URL`, `MAX_UPLOAD_MB`, `CORS_ORIGINS`).
  - Verify: `docker compose up -d db && cd backend && uv run pytest -q` (health test with DB up; 503 test with a bad URL).
  - Deps: none
  - Files: `backend/app/main.py`, `backend/app/config.py`, `backend/app/db.py`, `docker-compose.yml`,
    `backend/tests/test_health.py` (plus `pyproject.toml` from `uv init` and a one-line `.env.example`)

- [x] **T2: Frontend skeleton, served by FastAPI from one Docker image** (M)
  - Acceptance: Next.js with `output: 'export'` and `trailingSlash: true`; `/` shows the health status fetched from
    `/api/health`; the multi-stage `Dockerfile` builds the frontend then the Python image; FastAPI mounts `frontend/out`
    at `/` after the `/api` routers; `/templates/` and unknown paths (404.html) resolve **inside the container**.
  - Verify: `docker build -t hive-importer . && docker run --rm -p 8000:8000 -e PORT=8000 -e DATABASE_URL=... hive-importer`,
    then `curl -sf localhost:8000/api/health`, `curl -sf localhost:8000/templates/`, and `curl -s -o /dev/null -w '%{http_code}' localhost:8000/nope` → 404.
  - Deps: T1
  - Files: `frontend/next.config.ts`, `frontend/app/page.tsx`, `frontend/lib/api.ts`, `Dockerfile`, `backend/app/main.py`

- [ ] **T3: Deploy the skeleton to Render + Supabase** (S)
  - Acceptance: a Supabase project exists; the session-pooler `DATABASE_URL` is set in Render; `render.yaml` (Docker
    runtime, health check `/api/health`) is committed; the public Render URL returns ok from `/api/health` (proving the
    DB connection); the external uptime monitor is set to 5-minute pings.
  - Verify: `curl -sf https://<app>.onrender.com/api/health`; the Render dashboard shows the deploy as live.
  - Deps: T2 · **Needs you:** Supabase and Render accounts, and the secret values
  - Files: `render.yaml`, `README.md` (deploy section stub)

- [ ] **T4: Importer: detection, workbook reading and failure codes** (M)
  - Acceptance: pure functions turn bytes into header-keyed rows (openpyxl reading from `BytesIO`); magic-byte detection;
    zip-expansion guard; header matching by prefix. Returns `NOT_A_SPREADSHEET`, `LEGACY_XLS`, `NOT_A_SPECTORA_EXPORT`
    (listing the missing headers), `EMPTY_EXPORT`, `FILE_TOO_LARGE` or `UNREADABLE_WORKBOOK`, each with an
    inspector-facing message. The fixture generator writes every failure file.
  - Verify: `cd backend && uv run pytest tests/test_importer_failures.py -q`; both committed `.xls` files are read as xlsx with 42 headers.
  - Deps: none (can run in parallel with T1–T3)
  - Files: `backend/app/importer/detect.py`, `backend/app/importer/workbook.py`, `backend/app/importer/errors.py`,
    `backend/tests/fixtures/make_fixtures.py`, `backend/tests/test_importer_failures.py`

- [x] **T5: Importer: rows → template tree, with golden tests on both exports** (M)
  - Acceptance: builds sections → items → comments in row order; items keyed by (section, item); comments identified by
    `source_row`; names decoded once, comment HTML stored exactly; types, severity, answer type, options, recommendation,
    default value and all 42 raw cells captured. Commercial = 12/58/346 (266/72/8), Residential = 12/63/366 (279/76/11);
    Residential rows 263 and 264 are both present with their own text.
  - Verify: `uv run pytest tests/test_importer_golden.py -q`.
  - Deps: T4
  - Files: `backend/app/importer/parse.py`, `backend/app/importer/types.py`, `backend/tests/test_importer_golden.py`

- [ ] **T6: Importer: report notices and generality** (M)
  - Acceptance: the report has reconciliation, notices (`NO_TEXT_IN_SOURCE`, `EMBED_STRIPPED`, `DUPLICATE_NAME_IN_ITEM`,
    `UNKNOWN_TYPE`, `BLANK_SECTION`, `BLANK_ITEM`, `UNMODELLED_VALUE`) with row numbers, kept-but-not-editable columns
    with fill counts, and a not-in-export list. Golden rows match `docs/spectora-export-format.md` (e.g. Commercial
    no-text rows 4, 204, 234, …; embed rows 318 and 311). Variant fixtures (reordered or extra columns, missing optional
    columns, inline or shared strings, img/iframe/list HTML) import without code changes.
  - Verify: `uv run pytest tests/test_importer_golden.py tests/test_importer_variants.py -q && uv run pytest --cov=app/importer --cov-fail-under=90`.
  - Deps: T5
  - Files: `backend/app/importer/report.py`, `backend/app/importer/parse.py`, `backend/tests/fixtures/make_fixtures.py`,
    `backend/tests/test_importer_variants.py`, `backend/tests/test_importer_golden.py`

### Checkpoint A: after T1–T6
- [ ] `uv run pytest -q` passes, with importer coverage ≥ 90%
- [ ] The Render URL is live and `/api/health` reaches Supabase
- [ ] **Review with you:** walk through the golden values and report output for both files before building on them

## Phase 2: Baseline vertical slices

- [ ] **T7: Schema, import API and in-transaction verification** (M)
  - Acceptance: Alembic migration for `import_runs`, `templates`, `sections`, `items` and `comments` (ADR-004), with RLS
    enabled on every table. `POST /api/imports` saves the tree, re-reads it inside the transaction, compares it with the
    parsed source, and commits. A mismatch rolls back with `VERIFICATION_FAILED`. Failures store an `import_runs` row
    (`status=failed`) and **no** template rows. `GET /api/imports/{id}` and `/file` work.
  - Verify: `uv run alembic upgrade head && uv run pytest tests/test_api_imports.py -q` (both files succeed and report
    full matches; each failure code writes no template rows; a forced mismatch rolls back).
  - Deps: T1, T6
  - Files: `backend/app/models.py`, `backend/migrations/versions/0001_initial.py`, `backend/app/services/imports.py`,
    `backend/app/routes/imports.py`, `backend/tests/test_api_imports.py`

- [ ] **T8: Seed and template read API** (S–M)
  - Acceptance: `python -m app.seed` imports the Commercial export through `services/imports.py`, marks it `is_sample`,
    and is idempotent (a second run adds nothing). `GET /api/templates` returns counts; `GET /api/templates/{id}` returns
    the full tree in position order. Pydantic response schemas define the contract.
  - Verify: `uv run python -m app.seed && uv run python -m app.seed && uv run pytest tests/test_api_templates.py -q` (exactly one sample).
  - Deps: T7
  - Files: `backend/app/seed.py`, `backend/app/schemas.py`, `backend/app/routes/templates.py`, `backend/tests/test_api_templates.py`

- [ ] **T9: Browse UI** (M)
  - Acceptance: `/` redirects to `/template/?id=<sample>`. A tree of sections → items on the left; the selected item's
    comments grouped Information / Limitations / Defects on the right; HTML rendered with DOMPurify (shared allowlist,
    links open in a new tab with `rel="noopener noreferrer"`); read-only severity, options, recommendation, answer type
    and default value. Types come from `npm run gen:api`.
  - Verify: `npm run gen:api && npm run lint && npm run typecheck && npm run build`; manual check in the container:
    the seeded template shows 12 sections, and `General` appears under 7 sections as separate items.
  - Deps: T8
  - Files: `frontend/lib/sanitize.ts`, `frontend/app/template/page.tsx`, `frontend/components/SectionTree.tsx`,
    `frontend/components/CommentList.tsx`, `frontend/app/page.tsx`

### Checkpoint B: after T7–T9
- [ ] All tests pass, the container builds, and the change is deployed to Render
- [ ] **The live URL opens on the seeded Commercial template** (the first vertical slice works end to end)
- [ ] Review with you

- [ ] **T10: Upload and import report UI** (M)
  - Acceptance: `/templates/` lists templates and has an upload control. After an upload, `/import/?id=` shows
    reconciliation, "N of N comments match the source", notices with row numbers linking to the comment, kept-but-not-editable
    columns with fill counts, the not-in-export list, and an original-file download. Failures show the code's inspector-facing message.
  - Verify: `npm run lint && npm run typecheck && npm run build`; manual check: upload Residential (shows rows 263/264
    and embed row 311), upload the assignment PDF (shows the `NOT_A_SPREADSHEET` message).
  - Deps: T9
  - Files: `frontend/app/templates/page.tsx`, `frontend/app/import/page.tsx`, `frontend/components/ImportReport.tsx`, `frontend/components/UploadButton.tsx`

- [ ] **T11: Rename slice (template, section, item, comment name)** (M)
  - Acceptance: `PATCH /api/templates|sections|items/{id}` `{name}` and `PATCH /api/comments/{id}` `{name}` persist;
    `source_name` never changes. Inline edit: Enter saves, Esc cancels. An **Edited** badge and **Show original** appear on changed names.
  - Verify: `uv run pytest tests/test_api_edits.py -q` (persists across a new DB session; `source_*` unchanged); manual:
    rename, reload, still renamed.
  - Deps: T9
  - Files: `backend/app/routes/edits.py`, `backend/app/services/edits.py`, `backend/tests/test_api_edits.py`,
    `frontend/components/InlineName.tsx`, `frontend/app/template/page.tsx`

- [ ] **T12: Comment text editor** (M, **highest UI risk**)
  - Acceptance: TipTap limited to the ADR-005 allowlist, with the Link extension keeping `target`. It saves only when the
    user changed something. A comment with markup outside the allowlist (e.g. Commercial row 318) opens in HTML mode with
    a notice. The server sanitizes `text_html` with nh3 using the same allowlist. **Show original** works for text.
  - Verify: `uv run pytest tests/test_api_edits.py tests/test_sanitize.py -q` (parity cases); frontend unit test: open
    and close without changes → no PATCH request; manual: edit row 318's comment, and the embed wrapper survives HTML mode.
  - Deps: T11
  - Files: `frontend/components/CommentEditor.tsx`, `frontend/lib/sanitize.ts`, `backend/app/sanitize.py`,
    `backend/tests/test_sanitize.py`, `frontend/lib/sanitize.test.ts`

- [ ] **T13: Duplicate slice** (S–M)
  - Acceptance: `POST /api/templates/{id}/duplicate` deep-copies everything, source data included, in one transaction →
    `"<name> (copy)"` with `copied_from_id`. A Duplicate button opens the copy. Edits to the copy leave the original
    unchanged, and edits to the original leave the copy unchanged.
  - Verify: `uv run pytest tests/test_api_duplicate.py -q` (independence in both directions, identical tree and counts,
    new ids everywhere); manual in the UI.
  - Deps: T9 (T11 is needed for the manual edit check)
  - Files: `backend/app/services/duplicate.py`, `backend/app/routes/templates.py`, `backend/tests/test_api_duplicate.py`,
    `frontend/components/TemplateHeader.tsx`

### Checkpoint C: after T10–T13 (baseline complete)
- [ ] All tests pass; deployed to Render
- [ ] On the live URL: import Residential → rename a section → reload → duplicate → edit the copy → the original is unchanged
- [ ] Review with you before Phase 3

## Phase 3: Prove it and ship it

- [ ] **T14: End-to-end test against the container** (S)
  - Acceptance: Playwright runs the demo path (upload → rename → reload → duplicate → edit copy → original unchanged) and
    the "untouched comment sends no request" check, against `docker run`, not `next dev`.
  - Verify: `npx playwright test` is green against `localhost:8000`.
  - Deps: T10–T13
  - Files: `frontend/playwright.config.ts`, `frontend/e2e/demo-path.spec.ts`

- [ ] **T15: Live verification** (S, mostly manual)
  - Acceptance: every SPEC.md success criterion is checked on the Render URL. Edits survive a **service restart** from the
    Render dashboard. The uptime monitor shows it up. Results recorded in `NOTES.md → How I checked`.
  - Verify: the checklist in NOTES.md, with each criterion marked and the evidence noted.
  - Deps: T14
  - Files: `NOTES.md`

- [ ] **T16: README, NOTES and prompts** (M)
  - Acceptance: README has setup, DB init (`alembic upgrade head`, seed), env vars, and **"Hosted on Render, not Vercel,
    because…" (ADR-001)**. NOTES.md covers what was cut and why, supported input and limits (missing from the export vs
    not supported by us), how it was checked, time spent, and credits (OpenInspection as a reference only, libraries).
    `prompts/` holds the reusable prompts, skills and agent setup used.
  - Verify: follow the README from a fresh clone into an empty DB and reach the seeded app; no secrets (`git grep -i password`).
  - Deps: T15
  - Files: `README.md`, `NOTES.md`, `prompts/README.md`, `.env.example`

- [ ] **T17: Walkthrough outline** (S)
  - Acceptance: `docs/walkthrough-outline.md` covers the assignment's 7 parts with timings (8–10 minutes), exactly what to click, and
    which file and rows to show (row 318 embed, rows 263/264, a failure case with the PDF, the round-trip "346 of 346").
  - Verify: a dry run by you fits in 10 minutes.
  - Deps: T16
  - Files: `docs/walkthrough-outline.md`

### Checkpoint D: complete
- [ ] SPEC.md success criteria 1–8 all met
- [ ] Repo, live URL, video and NOTES.md ready to send

## Human tasks (alongside the build)

- [ ] **H1:** Email Hive about an extension (the stated deadline, 21 Sept, has passed).
- [ ] **H2:** Hive trial (required): run a sample inspection, publish a report, and try Hive's template import **with
      the same Commercial file**. Note concrete friction points for part 7 of the video.
- [ ] **H3 (optional):** Binsr: compare its template import with Hive's, or note why it was skipped.
- [ ] **H4:** Record the walkthrough (after T17) and upload it to YouTube as unlisted.
