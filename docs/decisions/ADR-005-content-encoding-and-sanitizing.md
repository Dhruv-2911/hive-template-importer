# ADR-005: Decode names once, keep comment HTML exactly as exported, sanitize when rendering

## Status
Accepted

## Date
2026-09-28

## Context
- Escaping differs by column in the same file. Section and item names are escaped twice (`&amp;` is left after the XML
  decode). Comment text is HTML, where `&amp;` is correct. Multiple-choice options are escaped once (`Bradford & White`).
- OpenInspection decodes repeatedly until the text stops changing. That hides the problem, but it can turn text that
  was meant literally (`&lt;b&gt;`) into real markup.
- Comment HTML contains links (some with `target="_blank"`), `<strong>`, and an empty video-embed wrapper `<div>`.

## Decision
- **Plain-text fields** (section, item and comment names, option lists): `html.unescape` exactly once, at import. They
  are otherwise stored exactly as exported, including trailing spaces.
- **Comment text:** stored exactly as the cell reads after XML decoding. It is never unescaped.
- **Rendering:** DOMPurify with one shared allowlist: `p br strong b em i u a ul ol li div span`. For `a`, only `href`,
  `target` and `rel` are allowed. Links are given `rel="noopener noreferrer"`.
- **Saving an edit:** the server sanitizes the new text with nh3, using the same allowlist.

## Alternatives Considered

### Decode repeatedly until the text is stable
- Cons: can turn intended text into markup, which garbles content or opens an XSS hole.
- Rejected.

### Strip HTML to plain text
- Cons: loses links and bold text, which is exactly why the assignment asks for the HTML export.
- Rejected.

### Convert to Markdown
- Cons: rewrites the customer's content and loses attributes.
- Rejected.

### Sanitize at import and store the sanitized version
- Cons: changes the imported content, which breaks the byte-for-byte round-trip check (ADR-006).
- Rejected. Sanitize when rendering, and on edited content only.

## Consequences
- The round-trip check can compare stored `text_html` with the source cell byte for byte.
- There are two sanitizers (DOMPurify in the browser, nh3 on the server), so the allowlist is defined once and tested on both sides.
- The empty embed wrapper renders as nothing. The import report explains that Spectora's export dropped the video.
