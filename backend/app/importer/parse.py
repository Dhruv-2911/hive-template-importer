"""Rows to a section → item → comment tree, in file order. Every decision that touches content is recorded."""

import html
from typing import cast

from app.importer.types import (
    COMMENT_TYPES,
    CommentDraft,
    CommentType,
    ItemDraft,
    ParseResult,
    RowIssue,
    SectionDraft,
    TemplateDraft,
)
from app.importer.workbook import Sheet, SourceRow

BLANK_SECTION = "(blank section)"
BLANK_ITEM = "(blank item)"
SEVERITIES = {"-1": -1, "0": 0, "1": 1}


def parse_sheet(sheet: Sheet, *, template_name: str) -> ParseResult:
    issues: list[RowIssue] = []
    # Each section/item is a contiguous run of rows. A name that reappears later starts a new run instead of
    # merging upwards, because merging would move rows out of file order (SPEC.md US1).
    sections: list[tuple[str, list[tuple[str, list[CommentDraft]]]]] = []
    for row in sheet.rows:
        section_name = _group_name(row, sheet.column_for["section"], BLANK_SECTION, "BLANK_SECTION", issues)
        item_name = _group_name(row, sheet.column_for["item"], BLANK_ITEM, "BLANK_ITEM", issues)
        if not sections or sections[-1][0] != section_name:
            sections.append((section_name, []))
        items = sections[-1][1]
        if not items or items[-1][0] != item_name:
            items.append((item_name, []))
        items[-1][1].append(_comment(row, sheet, issues))

    template = TemplateDraft(
        name=template_name,
        sections=tuple(
            SectionDraft(name, tuple(ItemDraft(item, tuple(comments)) for item, comments in items))
            for name, items in sections
        ),
    )
    return ParseResult(template, tuple(issues))


def _group_name(row: SourceRow, column: str, placeholder: str, code: str, issues: list[RowIssue]) -> str:
    name = html.unescape(row.cells[column])
    if name.strip():
        return name
    label = "section" if code == "BLANK_SECTION" else "item"
    issues.append(
        RowIssue(row.number, code, f"This row has no {label} name. It was kept under “{placeholder}”.")
    )
    return placeholder


def _comment(row: SourceRow, sheet: Sheet, issues: list[RowIssue]) -> CommentDraft:
    def cell(field: str) -> str:
        column = sheet.column_for.get(field)
        return row.cells[column] if column else ""

    source_type = cell("comment_type")
    return CommentDraft(
        source_row=row.number,
        comment_type=_comment_type(source_type, row.number, issues),
        source_type=source_type,
        name=html.unescape(cell("comment_name")),
        text_html=cell("comment_text"),
        severity=_severity(cell("category"), row.number, sheet, issues),
        answer_type=cell("answer_type").strip().lower() or None,
        options=_split_options(cell("options")),
        unit_options=_split_options(cell("unit_options")),
        recommendation=cell("recommendation").strip() or None,
        default_value=cell("default_value") or None,
        source_columns=dict(row.cells),
    )


def _comment_type(raw: str, row: int, issues: list[RowIssue]) -> CommentType:
    value = raw.strip().lower()
    if value in COMMENT_TYPES:
        return cast(CommentType, value)
    shown = f"is marked “{raw}”, which isn't" if raw.strip() else "has no comment type; it should be"
    issues.append(
        RowIssue(
            row,
            "UNKNOWN_TYPE",
            f"This comment {shown} info, limit or defect. It was kept under Unclassified.",
        )
    )
    return "unknown"


def _severity(raw: str, row: int, sheet: Sheet, issues: list[RowIssue]) -> int | None:
    value = raw.strip()
    if value == "":
        return None
    if value in SEVERITIES:
        return SEVERITIES[value]
    issues.append(
        RowIssue(
            row,
            "VALUE_NOT_UNDERSTOOD",
            f"{sheet.column_for['category']} is “{raw}”, not -1, 0 or 1. "
            "Severity is shown as empty; the value is kept as written.",
        )
    )
    return None


def _split_options(raw: str) -> tuple[str, ...]:
    return tuple(option.strip() for option in html.unescape(raw).split(",") if option.strip())
