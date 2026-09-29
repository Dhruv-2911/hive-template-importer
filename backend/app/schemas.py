"""API response shapes. The frontend's TypeScript types are generated from these (npm run gen:api)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


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
