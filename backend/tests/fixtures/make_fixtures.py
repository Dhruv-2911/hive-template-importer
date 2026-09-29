"""Spreadsheets the importer must cope with, built in memory.

Content here is invented. Nothing is copied from a real customer's export.
"""

import io
import zipfile

from openpyxl import Workbook

SPECTORA_HEADERS = [
    "Section Name",
    "Item Name",
    "Comment Name",
    "Comment Text",
    "Comment Type (info, limit, defect)",
    "Category (-1: Low, 0: Med, 1: High)",
    "Multiple Choice Options (comma-separated)",
    "Unit Type Options (numeric answers only, comma-separated)",
    "Recommendation (from list)",
    "Order (w/i item)",
    "Answer Type (boolean, checkbox, date, number, range, text)",
    "Default Value",
    'Default Value 2 (for "range" types)',
]


def xlsx(rows: list[list[object]]) -> bytes:
    """An xlsx whose first sheet holds `rows` (the first row is the header)."""
    workbook = Workbook()
    sheet = workbook.active
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def spectora_export(data_rows: list[list[object]]) -> bytes:
    return xlsx([SPECTORA_HEADERS, *data_rows])


def minimal_export() -> bytes:
    return spectora_export(
        [
            ["Alpha Area", "First Thing", "Note One", "<p>A sentence.</p>", "info"],
            ["Alpha Area", "First Thing", "Note Two", "<p>Another.</p>", "defect", 1],
        ]
    )


def headers_only_export() -> bytes:
    return spectora_export([])


def unrelated_spreadsheet() -> bytes:
    return xlsx([["Name", "Email"], ["Someone", "someone@example.com"]])


def legacy_xls() -> bytes:
    """The OLE compound-file header that old binary .xls files start with."""
    return b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 512


def pdf() -> bytes:
    return b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"


def truncated_xlsx() -> bytes:
    """A real xlsx cut in half: starts like a zip, can't be opened as one."""
    whole = minimal_export()
    return whole[: len(whole) // 2]


def zip_that_is_not_a_workbook() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", "<document/>")
    return buffer.getvalue()


def zip_with_workbook_marker_but_broken_contents() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("xl/workbook.xml", "this is not xml")
    return buffer.getvalue()
