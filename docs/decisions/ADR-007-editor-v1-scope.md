# ADR-007: Editor v1: rename and edit text, and never rewrite what the user didn't touch

## Status
Accepted

## Date
2026-09-28

## Context
- Baseline requirement: change section names, item names and comment text, then save. How much further to go is our call.
- The user is a non-technical inspector.
- Rich-text editors (TipTap / ProseMirror) normalize HTML when they load it. They drop elements they don't know (such
  as the embed wrapper `<div>`), drop attributes like `target` unless configured to keep them, and rewrite whitespace
  (such as `\n\n` between paragraphs). Loading a comment and saving it unchanged would silently rewrite it.

## Decision
- **Editable:** template name, section name, item name, comment name, comment text.
- **Not editable in v1:** type, severity, options, recommendation, answer type and order. There's no add, delete or reorder.
- Names are edited inline: Enter saves, Esc cancels.
- Comment text uses TipTap, limited to the ADR-005 allowlist, with the Link extension set to keep `target`.
- **A comment is sent to the server only when the user has changed it.** Comments the user doesn't touch keep their exact source HTML.
- Before a comment opens in TipTap, the client checks it for markup outside the allowlist. If it finds any, the comment
  opens in an HTML text area with a notice instead.
- The last write wins. Concurrent edits aren't detected.

## Alternatives Considered

### A raw HTML text area for every comment
- Pros: perfectly faithful.
- Cons: unfriendly for a non-technical inspector.
- Rejected, except as the fallback described above.

### TipTap for every comment
- Cons: the first save would silently strip content, such as row 318's embed wrapper.
- Rejected.

### Add, delete and reorder in v1
- Pros: useful day-to-day.
- Cons: reordering conflicts with the "same order as Spectora" guarantee, and all three add UI and tests to a two-day budget.
- Deferred, as agreed with the owner.

## Consequences
- An edited comment's HTML may differ in whitespace from the source even where the text reads the same. "Show original"
  always shows the source.
- Needs a test: opening a comment and closing it without changes sends no request, and the stored text stays byte-identical.
- The deferred features are listed in NOTES.md along with the reasons.
