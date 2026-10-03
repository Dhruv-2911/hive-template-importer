# Spec: Spectora template importer

**Status: APPROVED 2026-09-28. Amended 2026-10-03:** sign-in (US8, ADR-009), Hive's layout (US3, US7) and template
search (US9). The decisions are recorded in `docs/decisions/` (ADR-001 to ADR-009) and `docs/design.md`.
Inputs: `docs/requirements.md` (what is graded) and `docs/spectora-export-format.md` (measured facts about both exports).
Change this spec before building anything it doesn't describe.

## Objective

An inspection company leaving Spectora uploads its template export and gets back a structured, editable template that
it can **trust is complete**. The user works at a desk, is not technical, and has spent four years tuning this content.

**Committed exports**
- **Commercial** (`InterNACHI Commercial Template-2026-09-28.xls`): seeds the live app.
- **Residential** (`InterNACHI Residential -2026-09-28.xls`): the holdout that proves the importer works on more than one template.

### User stories and acceptance criteria

**US1: Import.** Upload a Spectora *Export HTML Text* spreadsheet and get the same template.
- Known values (from the profiler; the golden tests assert them):

  | | Sections | Items | Comments | Defect / Info / Limit | Links |
  |---|---|---|---|---|---|
  | Commercial | 12 | 58 | 346 | 266 / 72 / 8 | 28 |
  | Residential | 12 | 63 | 366 | 279 / 76 / 11 | 33 |
- Order follows source rows. Every source row maps to exactly one comment, identified by `source_row`. Nothing is
  dropped, truncated or re-worded.
- Items are grouped by (section, item) pair. Comments are identified by source row, **not by name**. Residential rows
  263 and 264 share a name, have different text, and must both survive.
- A section or item is a **contiguous run** of rows. If a name reappears after a different one, it becomes a separate
  section or item in file order, never merged upwards (merging would reorder rows). Neither real export does this.
- Plain-text names are entity-decoded once (`Doors, Windows &amp; Interior` → `Doors, Windows & Interior`). Comment HTML is
  stored exactly as it appears in the cell (ADR-005).
- The format is detected from the file's bytes, so an xlsx named `.xls` is accepted.
- The import is atomic: either the template and its verified report are saved, or nothing is saved and a clear error is shown.
- The template name defaults to the filename without its extension and can be edited.

**US2: Verifiable import report** (the improvement, ADR-006).
- **Reconciliation:** source rows → comments imported, plus section, item and per-type counts.
- **Round-trip check, inside the import transaction:** the saved rows are read back and compared with the parsed
  source. Any mismatch rolls back with `VERIFICATION_FAILED`. The report shows "346 of 346 comments match the source".
- **Needs attention:** row-level notices, each with its spreadsheet row number and a link to the comment:
  - `NO_TEXT_IN_SOURCE`: no text and no options. 9 in Commercial, 12 in Residential (row lists are in the format doc).
  - `EMBED_STRIPPED`: an empty video-embed wrapper. Commercial row 318, Residential row 311.
  - `DUPLICATE_NAME_IN_ITEM`: Residential rows 263 and 264.
  - `UNKNOWN_TYPE`, `BLANK_SECTION`, `BLANK_ITEM`: none in either file; covered by generated fixtures.
  - `UNMODELLED_VALUE`: a value in a column we keep but don't display (e.g. a Default Photo). None in either file.
  - `VALUE_NOT_UNDERSTOOD`: a value in a column we display that isn't in the expected form (e.g. Category `high`).
    It's shown as empty and kept as written in the source data. None in either file.
- **Kept but not editable:** source columns we store but don't edit, with how many rows fill each one
  (e.g. Residential Default Value: 1 row, Recommendation: 4 rows).
- **Not in the export:** template name, severity labels, recommendation labels, rating options, section-level text and
  embedded videos. Each is labelled "Spectora doesn't export this", as distinct from "we don't support this".
- The original uploaded file can be downloaded from the report.

**US3: Browse.** See the template the way the inspector knows it, laid out like Hive's own template screen
(`docs/design.md`).
- A template opens on its **Overview**:
  - its name and its counts (sections, items, comments; defects, information, limitations)
  - the import check result, with links to the import report and the original file
  - its sections, with item and comment counts
- Left panel: **← Back to Templates**, the template name, **Overview**, then the sections in file order. Each section
  expands to show its items with comment counts, and the section holding the open item is expanded.
- Choosing an item shows its comments grouped into **Information / Limitations / Defects**, with sanitized HTML
  rendered (links clickable, opening in a new tab).
- Read-only details for each comment: severity, recommendation key, answer type and default value. Multiple-choice
  options are listed as **answer choices** (US4).
- **Import notes on the comment itself:** every notice the import report holds for a comment's source row (US2) is shown
  on that comment, e.g. "This comment had an embedded video in Spectora…" on Commercial row 318. They come from the
  template's stored import report, so a copy shows its original's notes. They describe the import, so they stay after
  the comment is edited.

**US4: Edit** (ADR-007). Rename the template, sections, items and comment names; edit comment text.
- **Rename** and **Edit text** (or **Add text**) are visible buttons with an icon, next to every name and comment. Each
  item page starts with one line saying what can be changed.
- Changes save to the database and are still there after a reload and a container restart.
- Edited fields show an **Edited** badge and **Show original**.
- Comment text uses TipTap (paragraphs, bold, italic, underline, links, lists). A comment is sent to the server **only when
  the user changes it**. A comment with markup outside the allowlist opens in HTML mode with a notice.
- **Answer choices** (added 2026-10-03): a comment's multiple-choice options are buttons. Clicking one adds its text to
  the comment's text: at the end when reading (the editor opens), or at the cursor while editing. After another choice
  it's joined with a comma ("Cloudy, Hot"), after other words with a space. The inspector can type anything around it.
  It's saved like any text edit, only on **Save**. The options themselves don't change.

**US5: Duplicate.** Copy a template and edit the copy on its own.
- **Duplicate** creates `"<name> (copy)"`: a deep copy of sections, items, comments and stored source data, done in one transaction.
- Editing the copy leaves the original unchanged, and editing the original leaves the copy unchanged.
- The copy keeps every imported `source_*` value of its sections, items and comments, and the edits made before it was
  copied. Its *template* name is the exception: a template's name doesn't come from the export, so the copy's reference
  name is the one it was created with, and it's only marked Edited once the inspector renames it.

**US6: Fail honestly.** Bad input gets a specific, actionable message, and nothing is written.

| Input | Code | Message gist |
|---|---|---|
| PDF / image / unknown bytes | `NOT_A_SPREADSHEET` | "This isn't a spreadsheet. In Spectora use Export to spreadsheet → Export HTML Text." |
| Legacy binary `.xls` (OLE) | `LEGACY_XLS` | "Old Excel format. Re-export from Spectora or save as .xlsx." |
| xlsx without the required headers | `NOT_A_SPECTORA_EXPORT` | Lists the missing headers; hints at the plain-text export |
| Headers only, no rows | `EMPTY_EXPORT` | "This export has no comments." |
| Over 10 MB, or a zip that expands past 100 MB | `FILE_TOO_LARGE` | Shows the limit |
| Corrupt zip or workbook | `UNREADABLE_WORKBOOK` | "The file is damaged. Export it again." |
| The round-trip check finds a difference | `VERIFICATION_FAILED` | "Import stopped: saved data didn't match the file. Nothing was saved." Details list the rows |

Row-level problems don't block an import. They are imported and flagged: an unknown comment type is kept as `unknown`
in an "Unclassified" group, and a blank section or item name is kept under "(blank section)" / "(blank item)".

**US7: Seeded demo.** After sign-in, the live URL opens on the **Overview** of the Commercial export, already imported. Seeding runs that file through the
**same import pipeline** (not a SQL dump), is idempotent, and marks the template `is_sample`.
- `python -m app.seed` (run on every container start) imports the sample only if no sample exists, so restarts never
  touch edits.
- `python -m app.seed --reset` is for the operator only, never an API endpoint. It deletes the sample template (its
  sections, items and comments cascade), then imports the committed file again as a fresh sample. Copies made from
  the sample, other imported templates and every import run are kept. Copies' `copied_from_id` becomes null.
  It prints what it deleted and what it created.

**US8: Sign in** (ADR-009).
- Every page except `/login/` needs a signed-in user. A signed-out visitor is sent to `/login/` and, after signing in,
  back to the page they asked for (only a same-site path is followed).
- `/login/` offers **Sign in** and **Create account**, with an email and a password. Supabase's own reasons are shown
  (wrong password, already registered, password too short). If the project requires email confirmation, Create account
  says to check the inbox.
- Without a valid Supabase access token, every `/api` route except `/api/health` and `/api/auth/config` returns
  `401 AUTH_REQUIRED`. A 401 while signed in (an expired or revoked session) signs the browser out and returns it to
  `/login/`, even if Supabase can't be reached to end the session.
- A session that expired while the browser was closed is renewed quietly if Supabase allows it; otherwise the visitor
  lands on `/login/`.
- **No stale pages after a deploy.** Pages are served with `Cache-Control: no-cache`, so the browser checks for a new
  version on every visit. Build files under `/_next/static/`, whose names carry a content hash, are cached for a year.
  (Without the header, a browser kept showing the version from before sign-in, which called the API without a token.)
- The app rail shows the signed-in email and **Sign out**, which returns to `/login/`.
- Everyone who signs in shares one workspace: the same templates, with the last write winning.

**US9: Search the template.**
- A box above the template finds sections, items and comments whose name or text contains the query. It's
  case-insensitive, starts at 2 characters, and lists results in template order.
- Each result shows where it is (Section › Item › Comment) and the matching text. Choosing one opens that item with the
  comment highlighted, as a report link does.
- Keyboard: Ctrl/⌘+K focuses the box, the arrow keys move through results, Enter opens one and Escape clears. Up to 50
  results are shown, with the total.
- It searches the template already loaded in the browser and makes no API call.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2 + psycopg 3, Alembic, openpyxl, nh3, pydantic-settings, PyJWT[crypto].
  Dev: pytest, pytest-cov, httpx2 (Starlette test client), ruff. Managed with uv.
- **Frontend:** Next.js (App Router, `output: 'export'`, `trailingSlash: true`), TypeScript strict, Tailwind CSS,
  TanStack Query, TipTap, DOMPurify, openapi-typescript, `@supabase/supabase-js` (sign-in), `lucide-react` (icons).
  Dev: ESLint, Playwright.
- **Auth:** Supabase Auth with email and password. The backend verifies access tokens with PyJWT against the project's
  published keys (ADR-009).
- **Visual style:** Hive's layout with a flat look, with tokens and accessibility guard rails in
  [`docs/design.md`](docs/design.md).
- **Database:** Postgres 17 (Supabase runs 17.6). Local: docker compose. Production: **Supabase via the session pooler** (ADR-002). RLS is
  enabled with no policies.
- **Deploy:** one multi-stage Docker image as a **Render** web service (ADR-001), kept awake by an external uptime
  monitor that requests `/api/health` every 10 minutes (Render sleeps after about 15 idle). Blueprint in `render.yaml`.
- Versions are pinned in `uv.lock` and `package-lock.json` at scaffold time.

## Data model (ADR-004)

```
import_runs  id, filename, file_sha256, file_bytes (bytea)?, status (succeeded|failed),
             error_code, error_message, report (jsonb)?, created_at
templates    id, name, source_name, is_sample, import_run_id? → import_runs, copied_from_id? → templates,
             created_at, updated_at
sections     id, template_id → templates (cascade), position, name, source_name
items        id, section_id → sections (cascade), position, name, source_name
comments     id, item_id → items (cascade), position, source_row,
             comment_type (info|limit|defect|unknown), source_type,
             name, source_name, text_html, source_text_html,
             severity (-1|0|1)?, answer_type?, options text[], unit_options text[],
             recommendation?, default_value?, source_columns (jsonb: all 42 cells by header), edited_at?
```

- `position` comes from row order. The Order column is kept in `source_columns` and never re-sorted.
- `source_*` fields are written once at import and never changed. They power **Edited**, **Show original** and the round-trip check.
- A failed import still writes an `import_runs` row with `status=failed`, but no template rows. `file_bytes` is null
  only when the upload was rejected as too large.
- The link runs one way (template → its import run) to avoid a circular foreign key. A copy keeps its original's
  `import_run_id`, so its report stays reachable. An import run's own template is the one with that
  `import_run_id` and no `copied_from_id`. Deleting a template or run sets these references to null.

## API (FastAPI, JSON)

```
POST   /api/imports                   multipart file → 201 {import_run_id, template_id, report} | 422 {error}
GET    /api/imports/{id}              report
GET    /api/imports/{id}/file         original upload (download)
GET    /api/templates                 list with counts
GET    /api/templates/{id}            full tree (sections → items → comments)
PATCH  /api/templates/{id}            {name}
POST   /api/templates/{id}/duplicate  → 201 {template_id}
PATCH  /api/sections/{id}             {name}
PATCH  /api/items/{id}                {name}
PATCH  /api/comments/{id}             {name?, text_html?}  (text_html sanitized with nh3 on save)
GET    /api/health                    runs SELECT 1 (keeps the Render instance and Supabase awake). Public
GET    /api/auth/config               {supabase_url, supabase_publishable_key}: public values for the browser. Public
```
Every other route needs `Authorization: Bearer <Supabase access token>` and otherwise returns `401 AUTH_REQUIRED`
(ADR-009). Error shape: `{"error": {"code": "NOT_A_SPECTORA_EXPORT", "message": "...", "details": {...}}}`.

Frontend routes (static export, ADR-008):
- `/login/` (sign in or create an account)
- `/` → the sample template's overview
- `/templates/` (the list)
- `/upload/` (import from Spectora)
- `/template/?id=` (the overview; `&item=` opens an item, `&row=` highlights a comment)
- `/import/?id=` (the report)

## Commands

```bash
docker compose up -d db                                  # local Postgres 17 on :5433 (5432 is often taken)

cd backend
uv sync
uv run alembic upgrade head
uv run python -m app.seed                                # imports the Commercial export if no sample exists
DATABASE_URL=... uv run python -m app.seed --reset      # operator only: replace the sample with a fresh import
uv run uvicorn app.main:create_app --factory --reload --port 8000
uv run pytest -q
uv run pytest --cov=app/importer --cov-fail-under=90
uv run ruff check . && uv run ruff format --check .

cd frontend
npm ci
npm run gen:api                                          # regenerate lib/api-types.ts from the FastAPI schema (offline)
npm run dev                                              # :3000, NEXT_PUBLIC_API_BASE=http://localhost:8000
npm run lint && npm run typecheck
npm run build                                            # static export → frontend/out
npx playwright test                                      # demo path against the running container

docker build -t hive-importer .
docker run --rm -p 8000:8000 -e PORT=8000 -e DATABASE_URL=... hive-importer
# container start: alembic upgrade head && python -m app.seed && uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT

python scripts/profile_export.py "<export file>"         # profile any export before trusting the parser with it
```

Environment variables:
- `DATABASE_URL`: required.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: required by the web app, not by the seed.
- `PORT`: set by Render.
- `MAX_UPLOAD_MB`: default 10.
- `CORS_ORIGINS`: dev only.
- `NEXT_PUBLIC_API_BASE`: build time; empty in production.
- `SUPABASE_JWKS`: a fixed key set, for tests only.

They're documented in `.env.example`.

## Project Structure

```
SPEC.md  CLAUDE.md  README.md  NOTES.md
InterNACHI Commercial Template-2026-09-28.xls    seed export; never modified
InterNACHI Residential -2026-09-28.xls           holdout export; never modified
Dockerfile  docker-compose.yml  render.yaml  .env.example
backend/
  app/main.py                FastAPI app: /api routers, then frontend/out mounted at /
  app/config.py db.py models.py schemas.py seed.py
  app/importer/              PURE: bytes → (TemplateDraft, ImportReport). No DB, no I/O
    detect.py  workbook.py  parse.py  report.py
  app/services/              persist + verify, duplicate, edits
  app/routes/                imports.py, templates.py, edits.py, auth.py (public config)
  app/auth.py                verifies Supabase access tokens (ADR-009)
  migrations/                Alembic (enables RLS on every table)
  tests/fixtures/make_fixtures.py    generates failure and edge-case xlsx files
  tests/test_importer_*.py  tests/test_api_*.py
frontend/
  app/                       /, /login, /templates, /upload, /template, /import
  components/  lib/api.ts  lib/sanitize.ts (shared allowlist)  e2e/demo-path.spec.ts
docs/                        requirements.md, spectora-export-format.md, decisions/ (ADRs)
scripts/profile_export.py
tasks/                       plan.md, todo.md
prompts/                     reusable prompts and agent setup used during the build
```

## Code Style

The importer is pure functions over frozen dataclasses. Every decision that touches content leaves a trace in the report:

```python
@dataclass(frozen=True)
class RowIssue:
    row: int        # spreadsheet row number as the inspector sees it (header = 1)
    code: str       # "NO_TEXT_IN_SOURCE", "UNKNOWN_TYPE", "EMBED_STRIPPED", ...
    message: str    # written for the inspector, not the developer


def classify_type(raw: str, row: int, issues: list[RowIssue]) -> CommentType:
    value = raw.strip().lower()
    if value in COMMENT_TYPES:
        return value
    issues.append(RowIssue(row, "UNKNOWN_TYPE",
                           f"Comment type {raw!r} isn't info, limit or defect. Kept under Unclassified."))
    return "unknown"
```

- Python: type hints everywhere, ruff for lint and format, no DB or network access inside `app/importer/`.
- TypeScript: strict mode, named exports, function components, API types only from `npm run gen:api` (never hand-written).
- User-facing messages are plain English written for an inspector, and say what to do next.

## Testing Strategy

| Level | What | Where |
|---|---|---|
| Golden tests (×2) | Both committed exports: exact counts, source order, decoded names, `General` ×7/×8, every notice with its row numbers, links, every row accounted for | `test_importer_golden.py` |
| Generality | Generated fixtures: other sections, reordered or extra columns, missing optional columns, unknown type, blank names, img/iframe/list HTML | `test_importer_variants.py` |
| Failure cases | One test per US6 code. Each asserts the code, the message, and that **no template rows** were written | `test_importer_failures.py`, `test_api_imports.py` |
| API integration | Real Postgres. Edit persists across sessions; copy independence both ways; import atomicity; round-trip matches for both files; a forced mismatch rolls back | `test_api_*.py` |
| Sanitizer parity | The same HTML cases through DOMPurify and nh3 give the same allowed result | backend + frontend unit tests |
| Auth | No, expired, wrongly signed, wrong-audience or anonymous tokens get 401; health and config stay public; startup refuses missing settings | `test_auth.py` |
| E2E | Upload → rename → reload → duplicate → edit copy → original unchanged; opening and closing a comment without changes sends no request; signed-out redirect, sign in, create account, sign out, search | `frontend/e2e/*.spec.ts` (tokens minted with a test-only key; Supabase mocked) |

Coverage bar: 90% line coverage on `app/importer/`. No bar elsewhere; the integration tests cover behaviour.

## Boundaries

- **Always:** keep the import invariants in `CLAUDE.md`; run `pytest` before committing; change the schema only through
  Alembic migrations; validate upload size and type; update this spec (and add an ADR if needed) before building anything it doesn't describe.
- **Ask first:** schema changes once deployed with seeded data; dependencies not listed above; anything that contradicts an ADR;
  adding an LLM, auth or telemetry.
- **Never:** commit secrets or the assignment PDF; modify the committed exports; copy OpenInspection (AGPL) code; drop,
  truncate or re-word source content silently; store a template as one blob.

## Deliberately out of scope

| Cut | Why |
|---|---|
| Add, delete or reorder sections, items and comments | Agreed for v1 (ADR-007). Reordering risks the "same order as Spectora" guarantee |
| Editing severity, options, recommendations, answer types | Kept and displayed. Editing them needs Hive's own vocabulary, which the export doesn't include |
| Photos | Every photo column is empty in both exports, and a filled cell's format is unknown. Kept and flagged if present |
| Per-user templates, roles, password reset, multiple tenants, concurrent-edit conflicts | One shared workspace behind sign-in (ADR-009). Last write wins |
| Deleting templates, exporting back to Spectora, other vendors | Not needed to prove faithful import |
| Reports, scheduling, payments, mobile | Excluded by the assignment |

## Success Criteria

1. Both committed exports import to their known values (US1 table) in source order, and the round-trip check reports every comment matching.
2. Each report lists that file's `NO_TEXT_IN_SOURCE`, `EMBED_STRIPPED` and `DUPLICATE_NAME_IN_ITEM` rows by number, the
   kept-but-not-editable columns with fill counts, and the not-in-export items.
3. Each US6 input returns its error code and message, and writes no template rows. A forced verification mismatch rolls back.
4. A saved edit is still there after a reload and a container restart. **Show original** displays the imported value.
   An untouched comment's HTML stays byte-identical.
5. Edits to a copy and to its original never affect each other (integration test + e2e).
6. The generated variant fixtures import with no code changes.
7. The Render URL asks a signed-out visitor to sign in, and then opens on the seeded Commercial template's overview.
   The container runs with `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (+ `PORT`) set.
9. Without a valid token, every data route returns 401, and a new reviewer can create an account and get in.
8. README and NOTES.md state that hosting is on Render rather than Vercel, and why (ADR-001). All the assignment's deliverables exist.

## Resolved questions (2026-09-28)

| Question | Answer | Recorded in |
|---|---|---|
| Deploy target | One Docker container on Render; an external uptime monitor handles sleep | ADR-001 |
| Database | Supabase | ADR-002 |
| Improvement | An import report the inspector can trust | ADR-006 |
| Editor scope | No add, delete or reorder in v1 | ADR-007 |
| Holdout file | InterNACHI Residential, committed | this spec, US1 |
| Sign-in (2026-10-03) | The whole app; one shared workspace; email and password; open sign-up | ADR-009, US8 |
| Layout (2026-10-03) | Hive's layout with a flat look, an overview landing, collapsible sections, an app rail and search | `docs/design.md`, US3, US7, US9 |
