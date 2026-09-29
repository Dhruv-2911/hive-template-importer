"""Reading the real exports: bytes in, header-keyed rows out, with every cell kept."""

from app.importer.workbook import read_workbook
from tests.fixtures import make_fixtures as fx


def test_reads_an_xlsx_even_when_it_is_named_xls(commercial_bytes):
    sheet = read_workbook(commercial_bytes)

    assert len(sheet.headers) == 42
    assert sheet.headers[0] == "Section Name"
    assert len(sheet.rows) == 346


def test_row_numbers_match_what_the_inspector_sees_in_the_spreadsheet(residential_bytes):
    sheet = read_workbook(residential_bytes)

    assert [row.number for row in sheet.rows[:2]] == [2, 3]
    assert sheet.rows[-1].number == 367


def test_every_row_carries_every_column(commercial_bytes):
    sheet = read_workbook(commercial_bytes)

    assert all(set(row.cells) == set(sheet.headers) for row in sheet.rows)


def test_cell_text_is_kept_exactly_as_the_xml_decodes_it(commercial_bytes):
    rows = read_workbook(commercial_bytes).rows

    # Section names are escaped twice by Spectora; the reader must not decode the second level.
    assert rows[-1].cells["Section Name"] == "Doors, Windows &amp; Interior"
    # Trailing spaces survive.
    assert rows[15].cells["Comment Name"] == "Discoloration "


def test_numbers_are_read_as_their_text(commercial_bytes):
    row = read_workbook(commercial_bytes).rows[0]

    assert row.cells["Order (w/i item)"] == "5"
    assert row.cells["Default Estimate Max"] == "1000"


def test_known_columns_are_found_by_their_name_before_the_note(commercial_bytes):
    sheet = read_workbook(commercial_bytes)

    assert sheet.column_for["comment_type"] == "Comment Type (info, limit, defect)"
    assert sheet.column_for["default_value"] == "Default Value"
    assert sheet.column_for["category"] == "Category (-1: Low, 0: Med, 1: High)"


def test_blank_rows_are_recorded_rather_than_dropped_silently():
    data = fx.spectora_export(
        [
            ["Alpha Area", "First Thing", "Note One", "text", "info"],
            [None, None, None, None, None],
            ["Alpha Area", "First Thing", "Note Two", "text", "info"],
        ]
    )

    sheet = read_workbook(data)

    assert [row.number for row in sheet.rows] == [2, 4]
    assert sheet.blank_rows == (3,)


def test_a_column_without_a_header_is_still_kept():
    data = fx.xlsx(
        [
            [*fx.SPECTORA_HEADERS[:5], None],
            ["Alpha Area", "First Thing", "Note", "text", "info", "orphan value"],
        ]
    )

    row = read_workbook(data).rows[0]

    assert row.cells["(column F)"] == "orphan value"


def test_repeated_headers_do_not_overwrite_each_other():
    data = fx.xlsx(
        [
            [*fx.SPECTORA_HEADERS[:5], "Notes", "Notes"],
            ["Alpha Area", "First Thing", "Note", "text", "info", "first", "second"],
        ]
    )

    row = read_workbook(data).rows[0]

    assert row.cells["Notes"] == "first"
    assert row.cells["Notes (column G)"] == "second"
