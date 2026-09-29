"""Edited comment text is cleaned on the server with the same allowlist the browser uses (ADR-005)."""

import json
from pathlib import Path

import pytest

from app.sanitize import clean_comment_html

CASES = json.loads((Path(__file__).parent / "fixtures" / "sanitize_cases.json").read_text())["cases"]


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_the_shared_cases(case):
    cleaned = clean_comment_html(case["html"])

    for fragment in case["keep"]:
        assert fragment in cleaned
    for fragment in case["drop"]:
        assert fragment not in cleaned


def test_links_are_marked_safe_to_open_in_a_new_tab():
    cleaned = clean_comment_html('<a href="https://www.example.com" target="_blank">x</a>')

    assert 'rel="noopener noreferrer"' in cleaned
