"""Cleaning edited comment text before it's saved (ADR-005).

The allowlist matches frontend/lib/sanitize.ts; tests/fixtures/sanitize_cases.json is checked against both.
Imported text is never cleaned here: it's stored exactly as exported and only sanitized when rendered.
"""

import nh3

ALLOWED_TAGS = {"p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "div", "span"}
# nh3 adds rel="noopener noreferrer" to every link itself, so `rel` isn't accepted from the input.
ALLOWED_ATTRIBUTES = {"a": {"href", "target"}}
URL_SCHEMES = {"http", "https", "mailto"}


def clean_comment_html(html: str) -> str:
    return nh3.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, url_schemes=URL_SCHEMES)
