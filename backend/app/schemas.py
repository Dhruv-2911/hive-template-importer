"""API response shapes. The frontend's TypeScript types are generated from these (npm run gen:api)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any]


class ErrorBody(BaseModel):
    error: ErrorDetail


class Reconciliation(BaseModel):
    source_rows: int
    blank_rows: list[int]
    comments_imported: int
    sections: int
    items: int
    by_type: dict[str, int]
    sheets_not_read: list[str]


class Notice(BaseModel):
    row: int
    code: str
    message: str


class ColumnFill(BaseModel):
    header: str
    filled_rows: int


class NotInExport(BaseModel):
    key: str
    label: str
    detail: str


class Mismatch(BaseModel):
    row: int
    field: str


class Verification(BaseModel):
    checked: int
    matched: int
    mismatches: list[Mismatch]


class ImportReport(BaseModel):
    reconciliation: Reconciliation
    notices: list[Notice]
    kept_not_editable: list[ColumnFill]
    not_in_export: list[NotInExport]
    verification: Verification


class ImportCreated(BaseModel):
    import_run_id: uuid.UUID
    template_id: uuid.UUID
    report: ImportReport


class ImportRunOut(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    created_at: datetime
    template_id: uuid.UUID | None
    report: ImportReport | None  # set when the import succeeded
    error: ErrorDetail | None  # set when it was rejected


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int
    source_row: int
    comment_type: str
    source_type: str
    name: str
    source_name: str
    text_html: str
    source_text_html: str
    severity: int | None
    answer_type: str | None
    options: list[str]
    unit_options: list[str]
    recommendation: str | None
    default_value: str | None
    edited_at: datetime | None


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int
    name: str
    source_name: str
    comments: list[CommentOut]


class SectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int
    name: str
    source_name: str
    items: list[ItemOut]


class TemplateFields(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    source_name: str
    is_sample: bool
    import_run_id: uuid.UUID | None
    copied_from_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class TemplateCounts(BaseModel):
    sections: int
    items: int
    comments: int


class TemplateSummary(TemplateFields):
    counts: TemplateCounts


class TemplateTree(TemplateFields):
    sections: list[SectionOut]


class NameChange(BaseModel):
    name: str


class CommentChange(BaseModel):
    name: str | None = None
    text_html: str | None = None


class NamedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    source_name: str
