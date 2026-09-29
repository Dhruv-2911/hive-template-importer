"""Bytes to a template draft and its report. The single entry point the API and the seed script use."""

from dataclasses import dataclass
from pathlib import PurePosixPath

from app.importer.parse import parse_sheet
from app.importer.report import ImportReport, build_report
from app.importer.types import TemplateDraft
from app.importer.workbook import MAX_BYTES, read_workbook

DEFAULT_TEMPLATE_NAME = "Imported template"


@dataclass(frozen=True)
class Imported:
    template: TemplateDraft
    report: ImportReport


def import_export(data: bytes, *, filename: str, max_bytes: int = MAX_BYTES) -> Imported:
    """Raises ImportFailure when the upload can't be imported at all."""
    sheet = read_workbook(data, max_bytes=max_bytes)
    parsed = parse_sheet(sheet, template_name=template_name_from(filename))
    return Imported(parsed.template, build_report(sheet, parsed))


def template_name_from(filename: str) -> str:
    # Browsers may send a Windows path. The export carries no name of its own, so the file name is all we
    # have.
    stem = PurePosixPath(filename.replace("\\", "/")).stem.strip()
    return stem or DEFAULT_TEMPLATE_NAME
