// Markup the rich-text editor represents without losing anything (ADR-007). Everything the ADR-005 render allowlist
// permits beyond this (div, span, attributes other than a link's) would be dropped by the editor, so a comment
// containing it is edited as HTML instead.
const RICH_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "A", "UL", "OL", "LI"]);
const LINK_ATTRIBUTES = new Set(["href", "target", "rel"]);

export function fitsRichEditor(html: string): boolean {
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  for (const element of body.querySelectorAll("*")) {
    if (!RICH_TAGS.has(element.tagName)) return false;
    for (const attribute of element.getAttributeNames()) {
      if (element.tagName !== "A" || !LINK_ATTRIBUTES.has(attribute)) return false;
    }
  }
  return true;
}

/** Links typed without a scheme ("www.example.com") become https links; javascript: and the like are refused. */
export function normalizeLink(input: string): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return undefined;
  return `https://${value}`;
}
