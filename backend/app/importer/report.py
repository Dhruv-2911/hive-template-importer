"""The import report (ADR-006): what came in, what needs a look, and what Spectora never exported."""

import re
from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Any

from app.importer.types import CommentDraft, ParseResult, RowIssue, TemplateDraft
from app.importer.workbook import Sheet, base_name

# Columns shown in the editor (editable or read-only). Everything else is kept but not shown.
DISPLAYED_COLUMNS = {
    "section name",
    "item name",
    "comment name",
    "comment text",
    "comment type",
    "category",
    "multiple choice options",
    "unit type options",
    "recommendation",
    "answer type",
    "default value",
}
# Filled on every row of both real exports with defaults or metadata (Order ties, Estimate 10/1000, Uses 0,
# Last Modified = export time). Flagging them per row would bury real notices, so they only get fill counts.
QUIET_COLUMNS = {"order", "default estimate min", "default estimate max", "uses", "last modified"}
EDITABLE_FIELDS = ("section", "item", "comment_name", "comment_text")

EMPTY_EMBED = re.compile(
    r"<div[^>]*class=\"[^\"]*embed[^\"]*\"[^>]*>(?:\s|&nbsp;|\xa0)*</div>", re.IGNORECASE
)


@dataclass(frozen=True)
class Reconciliation:
    source_rows: int
    blank_rows: list[int]
    comments_imported: int
    sections: int
    items: int
    by_type: dict[str, int]
    sheets_not_read: list[str]

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ColumnFill:
    header: str
    filled_rows: int


@dataclass(frozen=True)
class NotInExport:
    key: str
    label: str
    detail: str


@dataclass(frozen=True)
class ImportReport:
    reconciliation: Reconciliation
    notices: tuple[RowIssue, ...]
    kept_not_editable: tuple[ColumnFill, ...]
    not_in_export: tuple[NotInExport, ...]
    verification: dict[str, Any] | None = field(default=None)  # filled in when the import is saved (T7)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_report(sheet: Sheet, parsed: ParseResult) -> ImportReport:
    comments = _comments(parsed.template)
    notices = sorted([*parsed.issues, *_content_notices(parsed.template)], key=lambda notice: notice.row)
    embeds = sum(1 for notice in notices if notice.code == "EMBED_STRIPPED")
    return ImportReport(
        reconciliation=Reconciliation(
            source_rows=len(sheet.rows),
            blank_rows=list(sheet.blank_rows),
            comments_imported=len(comments),
            sections=len(parsed.template.sections),
            items=sum(len(section.items) for section in parsed.template.sections),
            by_type={kind: 0 for kind in ("defect", "info", "limit", "unknown")}
            | dict(Counter(comment.comment_type for comment in comments)),
            sheets_not_read=list(sheet.sheet_names[1:]),
        ),
        notices=tuple(notices),
        kept_not_editable=_kept_not_editable(sheet),
        not_in_export=_not_in_export(embeds),
    )


def _comments(template: TemplateDraft) -> list[CommentDraft]:
    return [comment for section in template.sections for item in section.items for comment in item.comments]


def _content_notices(template: TemplateDraft) -> list[RowIssue]:
    notices: list[RowIssue] = []
    for section in template.sections:
        for item in section.items:
            notices.extend(_duplicate_names(item.comments))
            for comment in item.comments:
                if not comment.text_html.strip() and not comment.options:
                    notices.append(
                        RowIssue(
                            comment.source_row,
                            "NO_TEXT_IN_SOURCE",
                            "This comment has no text in the Spectora export, so it was imported empty. "
                            "Add wording in the editor if it needs some.",
                        )
                    )
                if EMPTY_EMBED.search(comment.text_html):
                    notices.append(
                        RowIssue(
                            comment.source_row,
                            "EMBED_STRIPPED",
                            "This comment had an embedded video in Spectora. The export keeps only an empty "
                            "placeholder, so the video didn't come across. Add the link again in the editor.",
                        )
                    )
                unshown = _unshown_values(comment)
                if unshown:
                    notices.append(
                        RowIssue(
                            comment.source_row,
                            "UNMODELLED_VALUE",
                            "Kept with the comment but not shown in the editor: "
                            + "; ".join(f"{header} (“{value}”)" for header, value in unshown)
                            + ".",
                        )
                    )
    return notices


def _duplicate_names(comments: tuple[CommentDraft, ...]) -> list[RowIssue]:
    rows_by_name: dict[str, list[int]] = {}
    for comment in comments:
        if comment.name.strip():
            rows_by_name.setdefault(comment.name.strip(), []).append(comment.source_row)
    notices = []
    for name, rows in rows_by_name.items():
        if len(rows) > 1:
            listed = ", ".join(str(row) for row in rows)
            for row in rows:
                notices.append(
                    RowIssue(
                        row,
                        "DUPLICATE_NAME_IN_ITEM",
                        f"“{name}” is the name of more than one comment in this item (rows {listed}). "
                        "All of them were kept.",
                    )
                )
    return notices


def _unshown_values(comment: CommentDraft) -> list[tuple[str, str]]:
    return [
        (header, value)
        for header, value in comment.source_columns.items()
        if value.strip() and base_name(header) not in DISPLAYED_COLUMNS | QUIET_COLUMNS
    ]


def _kept_not_editable(sheet: Sheet) -> tuple[ColumnFill, ...]:
    editable = {sheet.column_for[name] for name in EDITABLE_FIELDS}
    return tuple(
        ColumnFill(header, sum(1 for row in sheet.rows if row.cells[header].strip()))
        for header in sheet.headers
        if header not in editable
    )


def _not_in_export(embedded_videos: int) -> tuple[NotInExport, ...]:
    comments = "comment" if embedded_videos == 1 else "comments"
    videos = (
        f"{embedded_videos} {comments} had an embedded video that the export replaced with an empty "
        "placeholder. See the notices for which ones."
        if embedded_videos
        else "None detected in this file."
    )
    return (
        NotInExport(
            "template_name",
            "Template name",
            "Spectora's export doesn't include it. The name was taken from the file name; "
            "rename it any time.",
        ),
        NotInExport(
            "severity_labels",
            "Severity labels",
            "Only the level (-1, 0 or 1) is exported, not what each level is called in your "
            "Spectora account.",
        ),
        NotInExport(
            "recommendation_labels",
            "Recommendation wording",
            "Only the recommendation key (such as “hvac”) is exported, not the text behind it.",
        ),
        NotInExport(
            "rating_options",
            "Rating options",
            "Choices such as Inspected / Not Inspected / Not Present aren't in the export.",
        ),
        NotInExport(
            "section_text",
            "Section and report text",
            "Standards of practice, disclaimers and report introduction or summary text "
            "aren't in the export.",
        ),
        NotInExport("embedded_videos", "Embedded videos", videos),
    )
