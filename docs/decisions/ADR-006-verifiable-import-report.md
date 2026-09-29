# ADR-006: The improvement is an import report whose checks are actually run

## Status
Accepted

## Date
2026-09-28

## Context
- The assignment asks for one improvement: make the import easier to trust, make the editor easier for a
  non-technical inspector, or handle a difficult case well.
- The customer is betting four years of work on the migration. Hive's own switching guide tells users to keep the old
  account "until every piece is verified". A customer's first question is "did everything come across?"
- Real exports have row-level issues worth showing: 9 and 12 comments with no text, a video stripped by the export,
  duplicate comment names, and names escaped twice.

## Decision
Every import produces a report, stored on its `import_runs` row, with five parts:
1. **Reconciliation:** source rows compared with comments imported, plus section, item and per-type counts.
2. **Round-trip verification**, run **inside the import transaction**. The saved rows are read back and compared with
   the parsed source: names, text, type, order and source row. Any mismatch rolls the whole import back and returns
   `VERIFICATION_FAILED`, so a committed import has always passed verification.
3. **Needs attention:** row-level warnings, each with its row number and a link to the comment.
4. **Kept but not editable:** source columns we store but don't edit, with how many rows fill each.
5. **Not in the export:** limits of Spectora's export, labelled as distinct from gaps in our importer.

Alongside the report: a download of the original file, plus "Edited" badges and "Show original" in the editor (ADR-007).

## Alternatives Considered

### A friendlier editor (bulk edit, search, drag and drop)
- Pros: saves time after the migration.
- Cons: it doesn't answer "did everything come across?", and it's only useful once that question is answered.
- Deferred.

### A difficult case: recovering embedded video or photos
- Cons: the export doesn't contain them, so there's nothing to recover. The honest move is to report that.
- Rejected. The report states it.

## Consequences
- Each import does one extra read of about 350 rows, which is negligible.
- The report is a snapshot taken at import time. Later edits don't change it; the Edited badges show them instead.
- The report's shape is part of the API contract and is tested against both committed exports' known values.
- The report doubles as evidence for "how you checked preservation" in the walkthrough.
