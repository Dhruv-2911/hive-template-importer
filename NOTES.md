# Notes

The customer is an inspection company leaving Spectora with a template tuned over four years, and they won't retype
it. So I built for **trust first**. Every source row is accounted for, every column is kept, and an import is only
saved after the saved copy has been read back and compared with the file.

## Supported input

- **Spectora's *Export to spreadsheet → Export HTML Text* file.** Spectora names it `.xls`, but it's really `.xlsx`. The
  importer detects the format from the file's bytes, so either name works.
- **The first sheet**, with the header in row 1. Columns are matched **by name** (the part before the parenthetical note,
  case-insensitive), not by position. So a file with reordered columns, extra columns or only the five required ones
  still imports.
- **Tested on two real exports**, InterNACHI Commercial (346 comments) and InterNACHI Residential (366 comments), plus
  generated variants: reordered, missing and unknown columns, text stored inline, extra sheets, blank rows and names, and
  rich HTML.
- **Not supported:** legacy binary `.xls`, the plain-text export, and other vendors' formats. Each of these is refused
  with a specific message rather than guessed at.

## What came across, and the limits

**Kept exactly:** section, item and comment names (HTML entities decoded once, because Spectora escapes names twice),
comment HTML byte for byte, file order, and **all 42 cells of every row**, stored with each comment. Items are grouped
by (section, item), because `General` appears under 7–8 sections. Comments are identified by their spreadsheet row,
because Residential rows 263 and 264 share a name but have different text.

**Shown but not editable:** severity, multiple-choice options, recommendation key, answer type and default value. The
report lists every column that's kept but not editable, with how many rows fill it.

**Missing from Spectora's export.** These are limits of the file itself, not of this importer, and the report says so:
- the template name (only the filename has it)
- what each severity level is called in the customer's account
- the wording behind recommendation keys such as `hvac`
- rating options
- section-level text such as standards of practice and disclaimers
- **embedded videos**: the export keeps an empty placeholder `<div>`. Commercial row 318 and Residential row 311 are
  flagged on the report and on the comment itself.

**Formatting, links and rich content.** Comment HTML is stored exactly as exported and sanitized only when displayed
(DOMPurify), with an allowlist of `p br strong b em i u a ul ol li div span` and link `href/target`. Links open in a new
tab with `rel="noopener noreferrer"`. Edited text is cleaned on the server with nh3 using the same allowlist; one shared
set of test cases is checked against both sanitizers. Images and iframes aren't displayed. Neither real export contains
any; if one did, the HTML would still be stored, just not shown.

**The editor never rewrites what you didn't touch.** A comment is only sent to the server if the inspector changed it.
If a comment contains markup the rich-text editor can't represent (such as the video placeholder), it opens as HTML with
a notice, so the editor can't silently strip anything.
[ADR-005](docs/decisions/ADR-005-content-encoding-and-sanitizing.md) and [ADR-007](docs/decisions/ADR-007-editor-v1-scope.md)
have the details.

## The improvement: an import you can verify

I chose "make the import easier to trust", because the customer's first question is *did everything come across?*,
and Hive's own switching guide tells them to keep Spectora until every piece is verified. Every import produces a
report with:

1. **Round-trip verification inside the transaction.** The saved rows are read back and compared field by field with the
   parsed file before anything is committed. A mismatch rolls the whole import back (`VERIFICATION_FAILED`). The tests
   prove this with real database triggers that quietly truncate text or rename a section.
2. **Reconciliation:** rows in the file against comments imported, with sections, items and type counts.
3. **Needs a look:** row-level notices (no text in the source, video dropped by the export, the same name twice in one
   item, values not understood). Each links to the comment and is also shown on the comment in the editor.
4. **Kept but not editable**, and **not in Spectora's export**, as separate lists.
5. **The original file**, downloadable.

## What I cut, and why

| Cut | Why |
|---|---|
| Add, delete or reorder sections, items and comments | The baseline is rename and edit. Reordering would weaken the "same order as Spectora" guarantee this customer depends on. |
| Editing severity, options, recommendations, answer types | They're kept and shown. Editing them properly needs Hive's own vocabulary, which the export doesn't include. |
| Deleting templates | Not needed to prove faithful import. Test imports can only be removed with SQL (see Known issues). |
| Photos | Every photo column is empty in both exports, so the format of a filled cell is unknown. A filled one would be kept and flagged. |
| Login, multiple tenants, concurrent-edit detection | It's a single-user demo. The last write wins. |
| An LLM in the import path | The export's headers are self-describing, so a deterministic parser can be proven complete. A model would add the invented, merged or dropped content the assignment warns about ([ADR-003](docs/decisions/ADR-003-deterministic-importer-no-llm.md)). |
| Other vendors, exporting back to Spectora, reports, scheduling, payments, mobile | Out of scope for the assignment, or not needed to prove the import. |

## How I checked

- **Measured, not assumed.** `scripts/profile_export.py` profiled both exports before any parser code was written
  (`docs/spectora-export-format.md`). Test expectations were taken from the raw file. Twice, a value I'd assumed (a row
  number, an option order) turned out wrong when I checked it, and I corrected the test, not the code.
- **137 backend tests** (`uv run pytest`), with 97% coverage overall and 99% on the importer:
  - golden tests that pin both exports to their profiled counts, row lists and order
  - variant fixtures and one test per rejection code (each also checks that nothing was written)
  - migration and RLS tests (a non-owner database role sees no rows)
  - edit tests showing the imported originals never change
  - duplicate independence in both directions, plus atomicity under a failing trigger
  - statement-count tests that keep import and duplicate to a fixed number of database round trips
- **29 end-to-end tests** (`npm run e2e`) against the real Docker image, including the full demo path:
  - upload, then verify
  - rename and edit text, then reload
  - duplicate, then change the copy, and the original is unchanged
  - opening and closing the editor sends no request
  - pasted `<script>` never runs and isn't stored
- **On the live URL** (1 October 2026):
  - Both reports show the verified counts (346/346 and 366/366) with the expected notice rows.
  - Four kinds of bad file were refused with their codes, and the template count didn't change.
  - An edit made before a redeploy was still there afterwards, so edits survive a container restart.
  - The full flow (import, rename, reload, duplicate, edit the copy, original unchanged) passed in a browser.
- **A performance bug found on the live app.** Import took about 13 s and duplicate about 10 s, because the ORM's bulk
  insert split 366 comments into 127 statements, each a round trip from Singapore to Mumbai. Now one batched insert and
  an in-database copy take the UI flow to 4.4 s for import and 2.6 s for duplicate. Tests pin the statement counts so it
  can't come back.

## Known issues

- **No delete,** so my test imports on the live database can only be removed with SQL.
- **Render's free tier** sleeps when idle. An external monitor pings `/api/health` every 10 minutes to prevent it.
- **Saving rewrites whitespace:** once a comment's text is edited, TipTap normalizes its whitespace. The imported text is
  always one click away under "Show original text".
- **Edits are last-write-wins.** Two people editing the same comment at the same time won't be warned.

## Time spent

**[Fill in.]** The build history is 31 commits between 29 September and 1 October 2026 (`git log`).

## Credits

- **Libraries:** FastAPI, SQLAlchemy, Alembic, psycopg, openpyxl, nh3, Next.js (create-next-app scaffold), TanStack
  Query, TipTap, DOMPurify, Tailwind CSS, Playwright, openapi-typescript.
- **[OpenInspection](https://github.com/InspectorHub/OpenInspection)** (AGPL-3.0) was read as a **reference only**: its
  notes on Spectora export quirks, and its idea of reviewing an import before it's written. No code was copied. Its
  importer reads 5 of the 42 columns and silently truncates names; this one keeps every column and truncates nothing.
- **Claude Code** wrote much of the code with me, following the spec, ADRs and task plan in this repo.
  [prompts/README.md](prompts/README.md) describes the setup and the working rules.
