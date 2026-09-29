"""The imported template before it is saved, and the notices that explain what the importer did."""

from dataclasses import dataclass
from typing import Literal

CommentType = Literal["info", "limit", "defect", "unknown"]
COMMENT_TYPES: tuple[CommentType, ...] = ("info", "limit", "defect")


@dataclass(frozen=True)
class RowIssue:
    row: int  # spreadsheet row number as the inspector sees it (header = 1)
    code: str  # "NO_TEXT_IN_SOURCE", "UNKNOWN_TYPE", "EMBED_STRIPPED", ...
    message: str  # written for the inspector, not the developer


@dataclass(frozen=True)
class CommentDraft:
    source_row: int
    comment_type: CommentType
    source_type: str  # the Comment Type cell as written
    name: str  # entity-decoded once, otherwise exactly as exported
    text_html: str  # exactly as the cell reads; never decoded (ADR-005)
    severity: int | None
    answer_type: str | None
    options: tuple[str, ...]
    unit_options: tuple[str, ...]
    recommendation: str | None
    default_value: str | None
    source_columns: dict[str, str]  # every cell of the row, keyed by header (ADR-004)


@dataclass(frozen=True)
class ItemDraft:
    name: str
    comments: tuple[CommentDraft, ...]


@dataclass(frozen=True)
class SectionDraft:
    name: str
    items: tuple[ItemDraft, ...]


@dataclass(frozen=True)
class TemplateDraft:
    name: str
    sections: tuple[SectionDraft, ...]


@dataclass(frozen=True)
class ParseResult:
    template: TemplateDraft
    issues: tuple[RowIssue, ...]
