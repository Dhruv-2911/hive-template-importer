# Hive Inspect: Spectora template importer

Take-home for Hive Inspect (Forward Deployed Engineer). A desktop web app that imports a Spectora template export,
stores it in a structured schema, and lets an inspector edit and duplicate it.

## Read before working

- `SPEC.md`: the source of truth for scope, data model, API, commands and tests. Update it before building
  anything it doesn't describe.
- `docs/requirements.md`: what is being graded, as a checklist. Check scope decisions against it.
- `docs/spectora-export-format.md`: measured facts about the export. Base parser decisions on this file, not on
  assumptions about what a spreadsheet "usually" looks like.
- `docs/decisions/`: ADRs explaining why things are the way they are. Don't re-decide something recorded there without
  asking; a changed decision gets a new ADR that supersedes the old one.
- `InterNACHI Commercial Template-2026-09-28.xls` (seeds the app) and `InterNACHI Residential -2026-09-28.xls`
  (holdout): the committed exports. **Never modify them**; reviewers test against these exact bytes.

## Import invariants (non-negotiable)

1. **Nothing is lost silently.** Every source row ends up either imported or listed in the import report with its row
   number and the reason. No silent skips, truncation or "cleanup".
2. **Preserve text exactly.** No trimming, re-wording or re-wrapping of stored values. Any display-only normalization happens at render time.
3. **Hierarchy and order come from the file.** Section → item → comment, in row order. Items are keyed by
   (section, item) because names like `General` repeat across sections. Comments are identified by **source row**,
   never by name (Residential rows 263 and 264 share a name and have different text).
4. **Keep every source column.** Columns we don't model are still stored per comment (raw) and shown as
   "imported, not editable". Keep "missing from the export" separate from "present but unsupported".
5. **Escaping is per column.** Decode HTML entities once for plain-text fields. Comment Text is HTML: store it as
   it is, sanitize only when rendering, and never decode repeatedly.
6. **Detect format from bytes, not extension.** The real export is xlsx named `.xls`.
7. **Fail loudly and helpfully.** Wrong file type, missing headers or an empty export each get a clear message
   telling the inspector what to do.

## Stack

FastAPI (Python 3.12, uv) + Next.js static export (TypeScript) + Supabase Postgres (session pooler) via
`DATABASE_URL`, as one Docker container on Render (ADR-001, ADR-002, ADR-008). Details are in SPEC.md → Tech Stack.

## Commands

The full list is in SPEC.md → Commands. The most used:
- `uv run pytest -q` (in `backend/`): run before every commit.
- `npm run lint && npm run typecheck` (in `frontend/`).
- `python scripts/profile_export.py "<file>"`: run this on any new export before changing the parser.

## Verification

Every importer change must re-import **both** committed exports and match their known values, with every source row
accounted for:
- Commercial: 12 sections, 58 items, 346 comments (266 defect / 72 info / 8 limit), 28 links.
- Residential: 12 sections, 63 items, 366 comments (279 / 76 / 11), 33 links.

Also run the failure fixtures listed in `docs/spectora-export-format.md`.

## Boundaries

- No credentials in the repo. Environment variables go in `.env.local` (gitignored), and `.env.example` documents them.
- Don't copy code from OpenInspection (AGPL-3.0). Using it as a reference for format facts is fine; credit it in NOTES.md.
- Don't commit the assignment PDF (Hive's document).
- Record scope cuts and their reasons as they happen; they go into NOTES.md.
- Ask before changing the database schema once the app is deployed with seeded data.
