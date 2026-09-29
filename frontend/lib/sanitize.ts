import DOMPurify from "dompurify";

// ADR-005: one allowlist for rendering imported comment HTML. The server applies the same list with nh3 when an
// edited comment is saved (T12). Stored HTML is never changed; sanitizing happens only here, at render time.
export const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "div", "span"];
export const ALLOWED_ATTR = ["href", "target", "rel"];

let linksOpenInNewTab = false;

export function sanitizeCommentHtml(html: string): string {
  // Outside a browser DOMPurify can't sanitize and would hand the input back unchanged, so render nothing.
  if (typeof window === "undefined") return "";
  if (!linksOpenInNewTab) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
    linksOpenInNewTab = true;
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
