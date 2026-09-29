"""The import report for both committed exports (SPEC.md US2). Expected rows come from
docs/spectora-export-format.md, measured independently of this code."""

import pytest

from app.importer.pipeline import import_export


@pytest.fixture(scope="module")
def commercial(commercial_bytes):
    return import_export(commercial_bytes, filename="InterNACHI Commercial Template-2026-09-28.xls")


@pytest.fixture(scope="module")
def residential(residential_bytes):
    return import_export(residential_bytes, filename="InterNACHI Residential -2026-09-28.xls")


def rows_with(report, code):
    return [notice.row for notice in report.notices if notice.code == code]


def test_the_template_is_named_after_the_file(commercial, residential):
    assert commercial.template.name == "InterNACHI Commercial Template-2026-09-28"
    assert residential.template.name == "InterNACHI Residential -2026-09-28"


def test_reconciliation_accounts_for_every_source_row(commercial, residential):
    assert commercial.report.reconciliation.as_dict() == {
        "source_rows": 346,
        "blank_rows": [],
        "comments_imported": 346,
        "sections": 12,
        "items": 58,
        "by_type": {"defect": 266, "info": 72, "limit": 8, "unknown": 0},
        "sheets_not_read": [],
    }
    assert residential.report.reconciliation.comments_imported == 366
    assert residential.report.reconciliation.items == 63


def test_comments_with_no_text_in_the_source_are_listed_by_row(commercial, residential):
    assert rows_with(commercial.report, "NO_TEXT_IN_SOURCE") == [4, 204, 234, 245, 246, 257, 260, 264, 278]
    assert rows_with(residential.report, "NO_TEXT_IN_SOURCE") == [
        5, 192, 232, 236, 237, 245, 247, 251, 276, 342, 349, 367,
    ]  # fmt: skip


def test_the_video_spectora_dropped_is_reported(commercial, residential):
    assert rows_with(commercial.report, "EMBED_STRIPPED") == [318]
    assert rows_with(residential.report, "EMBED_STRIPPED") == [311]


def test_same_named_comments_in_one_item_are_reported(commercial, residential):
    assert rows_with(commercial.report, "DUPLICATE_NAME_IN_ITEM") == []
    assert rows_with(residential.report, "DUPLICATE_NAME_IN_ITEM") == [263, 264]


def test_the_real_exports_have_no_values_in_columns_we_do_not_show(commercial, residential):
    assert rows_with(commercial.report, "UNMODELLED_VALUE") == []
    assert rows_with(residential.report, "UNMODELLED_VALUE") == []


def test_notices_are_in_row_order(residential):
    rows = [notice.row for notice in residential.report.notices]

    assert rows == sorted(rows)


def test_columns_kept_but_not_editable_carry_their_fill_counts(commercial, residential):
    commercial_fill = {c.header: c.filled_rows for c in commercial.report.kept_not_editable}
    residential_fill = {c.header: c.filled_rows for c in residential.report.kept_not_editable}

    assert residential_fill["Default Value"] == 1
    assert residential_fill["Recommendation (from list)"] == 4
    assert commercial_fill["Recommendation (from list)"] == 346
    assert commercial_fill["Default Photo 1"] == 0
    # The four columns the inspector can edit are not in this list.
    assert {"Section Name", "Item Name", "Comment Name", "Comment Text"}.isdisjoint(commercial_fill)
    assert len(commercial_fill) == 38


def test_what_spectora_does_not_export_is_listed_separately(commercial):
    missing = {entry.key: entry for entry in commercial.report.not_in_export}

    assert list(missing) == [
        "template_name",
        "severity_labels",
        "recommendation_labels",
        "rating_options",
        "section_text",
        "embedded_videos",
    ]
    assert missing["embedded_videos"].detail.startswith("1 comment had an embedded video")
