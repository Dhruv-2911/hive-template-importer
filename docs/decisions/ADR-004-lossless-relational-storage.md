# ADR-004: Lossless storage: a relational tree plus an unchangeable copy of the source

## Status
Accepted

## Date
2026-09-28

## Context
- The assignment requires a structured, editable schema, "not one opaque HTML blob". Content must not be quietly
  dropped or rewritten, and unsupported content must be visible.
- The export has 42 columns, and we edit only a few fields. Columns that are empty in one template are filled in
  another: Default Value and Recommendation are empty or near-empty in one export and filled in the other.
- Names are not identifiers. `General` appears as an item under 7–8 sections, and the Residential export has two
  comments with the same name and **different text** in one item (rows 263 and 264).

## Decision
- Tables `templates → sections → items → comments`, each ordered by a `position` taken from source row order.
- A comment's identity from the file is its `source_row`. It stores typed fields that we display (type, severity,
  answer type, options, recommendation) and a `source_columns` jsonb field with **all 42 cells** keyed by header.
- Every editable field has a `source_*` twin that is written once at import and never changed.
- `import_runs` stores the uploaded file's bytes, its SHA-256 and the import report.
- Duplicating a template copies everything, source data included, in one transaction.

## Alternatives Considered

### One JSON document per template
- Pros: copying is one row, and there are no joins.
- Cons: every edit rewrites the whole document, tracking where each field came from is awkward, and it's close to the
  "one blob" the assignment rules out.
- Rejected.

### Model only the columns we use and drop the rest
- This is OpenInspection's approach: it reads 5 of the 42 columns.
- Cons: silent loss. Default Value on Residential row 126 would disappear.
- Rejected.

### A typed column for each of the 42 fields
- Cons: premature. The format of a filled photo cell is unknown and most columns are unused. A field can be promoted
  from `source_columns` later without asking anyone to upload again.
- Rejected for v1.

### Identify comments by (section, item, comment name)
- Cons: Residential rows 263 and 264 would collide, and one would overwrite the other.
- Rejected.

## Consequences
- Nothing in the uploaded file is ever discarded, so "Show original" and the "Edited" badge are easy to build.
- Promoting a raw column to a typed field later takes a migration plus a backfill from `source_columns`.
- Text is stored roughly twice, which is negligible at under 1 MB per template.
- Copies duplicate their source data too, which is fine at this scale.
