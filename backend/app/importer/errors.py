"""Reasons an upload is rejected as a whole (SPEC.md US6). Messages are written for the inspector."""

from typing import Any

EXPORT_HINT = "In Spectora, open the template and choose Export to spreadsheet → Export HTML Text."


class ImportFailure(Exception):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def not_a_spreadsheet() -> ImportFailure:
    return ImportFailure(
        "NOT_A_SPREADSHEET",
        f"This file isn't a spreadsheet. {EXPORT_HINT} Then upload the file it downloads.",
    )


def legacy_xls() -> ImportFailure:
    return ImportFailure(
        "LEGACY_XLS",
        "This is an old-format Excel file, which can't be read here. "
        "Export the template from Spectora again, or open it in Excel and save it as .xlsx.",
    )


def not_a_spectora_export(missing: list[str], found: list[str]) -> ImportFailure:
    return ImportFailure(
        "NOT_A_SPECTORA_EXPORT",
        f"This spreadsheet doesn't look like a Spectora template export. It has no {', '.join(missing)} "
        f"column. {EXPORT_HINT}",
        {"missing_headers": missing, "found_headers": found},
    )


def empty_export() -> ImportFailure:
    return ImportFailure(
        "EMPTY_EXPORT",
        "This export has the right columns but no comments in it. "
        "Check that you exported the right template.",
    )


def file_too_large(size: int, limit: int) -> ImportFailure:
    return ImportFailure(
        "FILE_TOO_LARGE",
        f"This file is {size / 1_000_000:.1f} MB, over the {limit / 1_000_000:.0f} MB limit. "
        "A Spectora template export is usually well under 1 MB.",
        {"size_bytes": size, "limit_bytes": limit},
    )


def expands_too_large(limit: int) -> ImportFailure:
    return ImportFailure(
        "FILE_TOO_LARGE",
        f"This file unpacks to more than {limit / 1_000_000:.0f} MB, far larger than any template export.",
        {"limit_bytes": limit},
    )


def unreadable_workbook() -> ImportFailure:
    return ImportFailure(
        "UNREADABLE_WORKBOOK",
        "This spreadsheet is damaged and can't be read. Export the template from Spectora again.",
    )
