# ADR-003: Deterministic importer, with no LLM in the import path

## Status
Accepted

## Date
2026-09-28

## Context
- The Spectora HTML-text export has fixed, self-describing headers: the same 42 headers in the same order in both
  exports we measured (`docs/spectora-export-format.md`).
- The assignment: *"If you use a model for import mapping, show what happens when it returns malformed output, invents
  sections, or drops content. Validation and honest failures matter."*
- The customer's priority is that nothing is lost or re-worded.

## Decision
The importer is pure Python. It detects the container from the file's bytes, reads the sheet with openpyxl, maps
columns by header prefix, builds the tree in row order, and records every decision in the import report. It makes no
model calls, and the same bytes always produce the same result.

## Alternatives Considered

### An LLM maps rows into our schema
- Pros: could cope with unfamiliar layouts or other vendors' formats.
- Cons: it can invent, merge or drop content. Its output would need checking against the source row by row, and that
  check needs a deterministic parser anyway. Results that change from run to run break the round-trip check
  (ADR-006). It also sends customer content to a third party, and adds cost and latency for 350+ rows.
- Rejected.

### An LLM only proposes mappings for unknown headers, and a person confirms them
- Pros: helps if Spectora renames a column.
- Cons: neither real export has anything to map, so there's nothing to test it against.
- Deferred. Revisit if a real export arrives with renamed headers.

## Consequences
- Only Spectora's HTML-text layout is supported. A file missing required headers fails with `NOT_A_SPECTORA_EXPORT`,
  and the message lists the missing headers. There is no guessing.
- Tests can assert exact counts for both committed exports, and the behaviour can be explained line by line in a live review.
- The walkthrough video explains this choice, as the assignment requests.
