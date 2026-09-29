"""Every way an upload can be rejected (SPEC.md US6). Each failure names its code and tells the inspector
what to do next."""

import pytest

from app.importer.errors import ImportFailure
from app.importer.workbook import read_workbook
from tests.fixtures import make_fixtures as fx


def failure_for(data: bytes, **limits) -> ImportFailure:
    with pytest.raises(ImportFailure) as caught:
        read_workbook(data, **limits)
    return caught.value


def test_a_pdf_is_not_a_spreadsheet():
    failure = failure_for(fx.pdf())

    assert failure.code == "NOT_A_SPREADSHEET"
    assert "Export HTML Text" in failure.message


def test_an_empty_upload_is_not_a_spreadsheet():
    assert failure_for(b"").code == "NOT_A_SPREADSHEET"


def test_a_zip_without_a_workbook_is_not_a_spreadsheet():
    assert failure_for(fx.zip_that_is_not_a_workbook()).code == "NOT_A_SPREADSHEET"


def test_a_legacy_binary_xls_is_named_as_such():
    failure = failure_for(fx.legacy_xls())

    assert failure.code == "LEGACY_XLS"
    assert ".xlsx" in failure.message


def test_a_spreadsheet_without_spectora_columns_lists_what_is_missing():
    failure = failure_for(fx.unrelated_spreadsheet())

    assert failure.code == "NOT_A_SPECTORA_EXPORT"
    assert failure.details["missing_headers"] == [
        "Section Name",
        "Item Name",
        "Comment Name",
        "Comment Text",
        "Comment Type",
    ]
    assert "Section Name" in failure.message


def test_an_export_with_headers_and_no_rows_is_empty():
    failure = failure_for(fx.headers_only_export())

    assert failure.code == "EMPTY_EXPORT"


def test_a_file_over_the_upload_limit_is_too_large():
    data = fx.minimal_export()

    failure = failure_for(data, max_bytes=len(data) - 1)

    assert failure.code == "FILE_TOO_LARGE"
    assert failure.details == {"size_bytes": len(data), "limit_bytes": len(data) - 1}


def test_a_zip_that_expands_past_the_limit_is_too_large():
    failure = failure_for(fx.minimal_export(), max_expanded_bytes=1000)

    assert failure.code == "FILE_TOO_LARGE"
    assert failure.details["limit_bytes"] == 1000


def test_a_truncated_workbook_is_unreadable():
    failure = failure_for(fx.truncated_xlsx())

    assert failure.code == "UNREADABLE_WORKBOOK"
    assert "Export the template from Spectora again" in failure.message


def test_a_workbook_with_broken_contents_is_unreadable():
    assert failure_for(fx.zip_with_workbook_marker_but_broken_contents()).code == "UNREADABLE_WORKBOOK"
