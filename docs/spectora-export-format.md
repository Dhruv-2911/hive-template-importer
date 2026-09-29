# Spectora export format: measured facts

Measured with `scripts/profile_export.py` on two stock templates from Spectora's template library. Both were exported
on 2026-09-28 with *Export to spreadsheet → Export HTML Text*. Neither contains customer data.

| Short name | File | SHA-256 (prefix) |
|---|---|---|
| **Commercial** (primary, seeds the app) | `InterNACHI Commercial Template-2026-09-28.xls` | `e5d34e86a925` |
| **Residential** (holdout) | `InterNACHI Residential -2026-09-28.xls` | `2a9c664ee89d` |

Two files are a small sample. "Holds in both" means seen twice, not guaranteed. Re-run the profiler on any new export.

## Holds in both files

### Container
| Fact | Consequence |
|---|---|
| Named `.xls`, but the bytes are **xlsx** (a zip starting with `PK`) | Detect the format from magic bytes. `openpyxl.load_workbook(path)` refuses a `.xls` path, so pass `io.BytesIO(bytes)` |
| One sheet, **the same 42 headers** in the same order, header row 1 | Still match columns by header prefix, never by position. Headers continue into notes, e.g. `Comment Type (info, limit, defect)` |
| Text cells are `t="str"`, there is no `sharedStrings.xml`, and empty cells are often self-closing | openpyxl handles this. A hand-written XML reader must not assume shared strings |

### Escaping (this varies by column within each file)
| Column | After one XML decode | Rule |
|---|---|---|
| Section Name, Item Name | `Doors, Windows &amp; Interior` (double-escaped) | Plain text: decode HTML entities **once** |
| Comment Name, Multiple Choice Options | no entities; `Bradford & White` is single-escaped | Plain text: decode once (a no-op in both files) |
| Comment Text | `settling &amp; cracking` | **HTML**: store it as it is. `&amp;` is correct HTML. Never decode repeatedly |

### Structure and content
- The tree is implied by repetition: section and item names appear on every row. Sections and items are contiguous;
  none reappears later in the file.
- **Item names repeat across sections** (`General` ×7 in Commercial, ×8 in Residential; `Normal Operating Controls` ×2 in both).
  Key items by the (section, item) pair.
- **`Order (w/i item)` agrees with row order** in every (section, item, type) group of both files. Row order is the
  source of truth; the Order value is kept as source data.
- Comment Type is only `info`, `limit` or `defect`. Category (severity) is set only on defects, as `0` or `1`; `-1` never occurs.
- Answer Type: defects and limitations are `boolean`; info comments are mostly `checkbox`, with their choices in Multiple Choice Options
  (comma-separated; values can contain `"`). An info comment with options and no text is normal: the options are the content.
- Default Estimate Min/Max are `10`/`1000` on every row, Uses is `0` on every row, and Last Modified is the export time.
  These look like Spectora defaults and metadata, not the author's content. Preserve them anyway.
- Every Default Photo 1–10 column and its caption is empty. The format of a filled value is unknown, so flag it if one appears.
- Comment text mixes HTML cells (`<p>…</p>`, `\n\n` between paragraphs) with plain-text cells. Both are valid HTML fragments.
  Non-breaking spaces (U+00A0) appear only in comment text.
- Some comment names end in a space (`'Corrosion '`, `'Inaccessible '`). Preserve them.
- **Spectora's export strips embedded video.** The `Doors, Windows & Interior / Walls / Doorknob Hole` comment has an
  empty `<div class="youtube-embed-wrapper" …>&nbsp;</div>` in both files.

## Varies by template (never hardcode)

| Measure | Commercial | Residential |
|---|---|---|
| Sections / items (pairs) / distinct item names | 12 / 58 / 51 | 12 / 63 / 55 |
| Comments (defect / info / limit) | 346 (266 / 72 / 8) | 366 (279 / 76 / 11) |
| Links (`<a href>`) | 28 | 33 |
| Tags in comment text | `p`, `a`, `div` | `p`, `a`, `div`, **`strong`** |
| Comments with no text and no options | 9: rows 4, 204, 234, 245, 246, 257, 260, 264, 278 | 12: rows 5, 192, 232, 236, 237, 245, 247, 251, 276, 342, 349, 367 |
| Row with the stripped video embed | 318 | 311 |
| Recommendation filled | **all 346** rows (26 keys) | **4** rows (`pro` ×3, `monitor` ×1) |
| Order column values | 287 of 346 are `5` (ties) | 0–12, meaningful |
| Default Value filled | none | **row 126** (`true`, a boolean info comment) |
| Same comment name twice in one item | none | **rows 263 and 264**: `Fireplace / Damper Doors / Damper Inoperable`, **different text** |
| Longest section name (decoded) | 35 characters | 44 characters (`Basement, Foundation, Crawlspace & Structure`) |

What this means for the importer:
- Identify a comment by its **source row**, never by its name. Keying on (section, item, comment name) would merge or overwrite
  rows 263 and 264 in Residential.
- "Empty in the first file" doesn't mean "always empty". Default Value, Recommendation and the photo columns all need to be kept.

## Missing from the export entirely

The importer cannot recover these. That's a limit of the export, not of the importer:
- **Template name.** It appears only in the filename.
- **Severity labels.** What `-1/0/1` mean to this inspector is set in Spectora's template settings.
- **Recommendation display text.** Only keys such as `hvac` are exported.
- **Rating options** (Inspected / Not Inspected / Not Present…), section-level text (standards of practice, disclaimers),
  report introduction or summary text, and template settings.
- **Embedded videos** (see above).

## Failure inputs worth testing

- A non-spreadsheet file (e.g. a PDF) → the profiler reports `real format: unknown`.
- A genuine legacy `.xls` (OLE header `D0 CF 11 E0`).
- An xlsx without the required headers, e.g. the plain-text export or an unrelated spreadsheet.
- An export with headers but no data rows.
- A row with a blank or unknown comment type, or a blank section or item name.
