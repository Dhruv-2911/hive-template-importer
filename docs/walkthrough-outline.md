# Walkthrough outline (8–10 minutes)

The seven parts the assignment asks for, with timings, what to click and what to say. Spend most of the time on
parts 2–6.

## Before recording

- [ ] Reset the sample so it opens clean:
      `cd backend && DATABASE_URL="$(grep ^DATABASE_URL ../.env | cut -d= -f2-)" uv run python -m app.seed --reset`
- [ ] Open https://hive-template-importer-f6w9.onrender.com once, so the instance is warm.
- [ ] On the desktop: `InterNACHI Residential -2026-09-28.xls`, plus one file that isn't a Spectora export, such as any
      `.txt` or `.png` (not Hive's PDF), for the failure case.
- [ ] In the editor, open `backend/app/services/imports.py` (`_compare_with_database`), `backend/app/models.py`,
      `backend/tests/test_api_imports.py` (the trigger tests) and `docs/decisions/README.md`.
- [ ] Your notes from the Hive trial (part 7) and, if you did it, Binsr (part 5).

## 1. You (0:00–0:40), camera on

Who you are and what you've worked on, in two or three sentences. Then one line on what this is: "an importer for an
inspector leaving Spectora with four years of template work".

## 2. What you built (0:40–3:20)

1. **The live URL opens on the sample** (Commercial, 346 comments). Point out the section/item navigator in Spectora's
   order and the Information / Limitations / Defects groups, and say they mirror Spectora.
2. **Import on camera.** Templates → *Choose export file…* → the Residential `.xls`. Mention that it's really an xlsx
   with the wrong extension, so the importer reads the file's bytes, not its name.
3. **The report:** "All 366 comments were saved and match the file". Say how: every saved comment is read back and
   compared before anything is kept. Scroll to **Needs a look**:
   - row 311: Spectora's export dropped the video
   - rows 263 and 264: the same name twice in one item, both kept
   - the 12 comments with no text in the export

   Then **Kept but not editable** and **Not in Spectora's export**.
4. Click **Row 311**. It opens on the comment, and the import note sits right there.
5. **An edit, saved:** rename the section *Roof* → "Roof & Gutters". Edit row 12's text and make a phrase bold. Reload:
   both are still there. Show the **Edited** badge and **Show original**.
6. **A copy, changed independently:** Duplicate → the copy opens. Rename a section in the copy, then *Open the
   original*. The original has its own edits and none of the copy's.

## 3. The repo (3:20–4:30)

- Layout: `backend/app/importer/` (pure: bytes in, draft and report out), `services/`, `routes/`, `migrations/`;
  `frontend/`; `docs/`; `SPEC.md`; `tasks/`.
- Stack: FastAPI, SQLAlchemy, Alembic and openpyxl; Next.js static export, TanStack Query and TipTap; Supabase Postgres;
  one Docker image on Render.
- Existing code: the create-next-app scaffold and the libraries. OpenInspection was read for format quirks only; no code
  was copied.
- AI tools: show `CLAUDE.md` (the import rules), `docs/spectora-export-format.md` (measured facts), the ADR list and
  `tasks/todo.md`. Explain the loop: spec → ADRs → plan → failing test → code → commit. Show `prompts/README.md`.

## 4. The data model (4:30–6:00)

- `models.py`: `import_runs` → `templates` → `sections` → `items` → `comments`.
- The faithfulness columns:
  - `source_*` values are written once at import and never change. They drive Edited and Show original.
  - `source_columns` holds all 42 cells of every row.
  - Comments are identified by `source_row`, because names repeat (263/264).
- The mapping: one row → one comment; contiguous rows → items and sections; names decoded once; comment HTML byte for
  byte.
- How you checked it survived: `_compare_with_database`, then the trigger tests that shorten text or rename a section on
  the way in. Verification catches exactly the changed rows and saves nothing.

## 5. Your decisions (6:00–7:30)

- **What I prioritised:** trust over features. The report and round-trip check are the improvement, because the
  customer's question is "did everything come across?"
- **What I left out, and why:** add, delete and reorder; editing severity and options; photos; login. See NOTES.md.
- **Render, not Vercel:** this is a deliberate deviation, so say it plainly: one image that runs the same locally and in
  production (ADR-001).
- **No LLM:** the headers are self-describing, so a deterministic parser can be proven complete (ADR-003).
- *(If you explored Binsr: how its import differs from Hive's, and what that changed in your design.)*

## 6. The hard part (7:30–9:00)

Pick one to tell properly:
- **Identity and escaping.** Names can't be keys (rows 263/264; `General` under 8 sections), and escaping differs by
  column (names double-escaped, comment HTML not). The answer is identity by row and decoding per column.
- **The editor rewriting HTML.** TipTap would silently strip the video placeholder. The answer: send only what changed,
  and open such comments in HTML mode.
- **A production-only bug.** Import took 13 s live because the ORM split 366 comments into 127 statements across
  Singapore–Mumbai. Show the statement-count test.

**One failure case on camera:** upload the `.txt` or `.png`. It's refused with *what to do next*, and nothing is saved.
Optionally show the `VERIFICATION_FAILED` test as the failure you can't easily stage live.

## 7. Hive (9:00–9:40)

Two or three direct, specific findings from your trial: where import was confusing, what you couldn't verify, what
you'd change. Keep it concrete, e.g. "after import I couldn't tell whether X came across".
