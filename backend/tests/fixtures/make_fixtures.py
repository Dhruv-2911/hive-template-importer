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


def hand_written_xlsx(rows: list[list[str]], cell_type: str = "str", extra_sheets: int = 0) -> bytes:
    """A minimal xlsx written by hand, without a shared-strings table.

    cell_type "str" mimics Spectora's export (text as formula-string results); "inlineStr" mimics files
    written by scripts. Both put the text in the sheet itself, which a reader that only knows shared strings
    misses.
    """

    def cell(ref: str, value: str) -> str:
        escaped = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if cell_type == "inlineStr":
            return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{escaped}</t></is></c>'
        return f'<c r="{ref}" t="str"><v>{escaped}</v></c>'

    def sheet_xml(sheet_rows: list[list[str]]) -> str:
        body = "".join(
            f'<row r="{r}">'
            + "".join(cell(f"{chr(65 + c)}{r}", v) for c, v in enumerate(values) if v != "")
            + "</row>"
            for r, values in enumerate(sheet_rows, start=1)
        )
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f"<sheetData>{body}</sheetData></worksheet>"
        )

    sheet_count = 1 + extra_sheets
    main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    sheets = "".join(
        f'<sheet name="Sheet{i}" sheetId="{i}" r:id="rId{i}"/>' for i in range(1, sheet_count + 1)
    )
    rels = "".join(
        f'<Relationship Id="rId{i}" Type="{rel}/worksheet" Target="worksheets/sheet{i}.xml"/>'
        for i in range(1, sheet_count + 1)
    )
    overrides = "".join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(1, sheet_count + 1)
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" '
            'ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            f"{overrides}</Types>",
        )
        archive.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f'<Relationship Id="rId1" Type="{rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        )
        archive.writestr(
            "xl/workbook.xml",
            f'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{main}" xmlns:r="{rel}">'
            f"<sheets>{sheets}</sheets></workbook>",
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}'
            "</Relationships>",
        )
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml(rows))
        for i in range(2, sheet_count + 1):
            archive.writestr(f"xl/worksheets/sheet{i}.xml", sheet_xml([["Something else"]]))
    return buffer.getvalue()
