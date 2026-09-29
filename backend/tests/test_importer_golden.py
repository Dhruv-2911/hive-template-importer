"""Both committed exports, parsed. Expected values were measured independently with scripts/profile_export.py
and are recorded in docs/spectora-export-format.md."""

from collections import Counter

import pytest

from app.importer.parse import parse_sheet
from app.importer.workbook import read_workbook

COMMERCIAL_SECTIONS = [
    "Inspection Details",
    "Roof",
    "Exterior",
    "Wood Decks and Balconies",
    "Basement, Foundation and Crawlspace",
    "Heating and Ventilation",
    "Cooling",
    "Plumbing",
    "Electrical",
    "Fireplaces",
    "Attic, Insulation & Ventilation",
    "Doors, Windows & Interior",
]
RESIDENTIAL_SECTIONS = [
    "Inspection Details",
    "Exterior",
    "Roof",
    "Basement, Foundation, Crawlspace & Structure",
    "Heating",
    "Cooling",
    "Plumbing",
    "Electrical",
    "Fireplace",
    "Attic, Insulation & Ventilation",
    "Doors, Windows & Interior",
    "Built-in Appliances",
]


@pytest.fixture(scope="module")
def commercial(commercial_bytes):
    sheet = read_workbook(commercial_bytes)
    return sheet, parse_sheet(sheet, template_name="InterNACHI Commercial Template-2026-09-28")


@pytest.fixture(scope="module")
def residential(residential_bytes):
    sheet = read_workbook(residential_bytes)
    return sheet, parse_sheet(sheet, template_name="InterNACHI Residential -2026-09-28")


def all_comments(template):
    return [comment for section in template.sections for item in section.items for comment in item.comments]


def test_commercial_has_the_measured_shape(commercial):
    _, result = commercial
    template = result.template

    assert [section.name for section in template.sections] == COMMERCIAL_SECTIONS
    assert sum(len(section.items) for section in template.sections) == 58
    assert Counter(c.comment_type for c in all_comments(template)) == {"defect": 266, "info": 72, "limit": 8}


def test_residential_has_the_measured_shape(residential):
    _, result = residential
    template = result.template

    assert [section.name for section in template.sections] == RESIDENTIAL_SECTIONS
    assert sum(len(section.items) for section in template.sections) == 63
    assert Counter(c.comment_type for c in all_comments(template)) == {"defect": 279, "info": 76, "limit": 11}


@pytest.mark.parametrize("export, last_row", [("commercial", 347), ("residential", 367)])
def test_every_source_row_becomes_exactly_one_comment_in_file_order(export, last_row, request):
    _, result = request.getfixturevalue(export)

    assert [c.source_row for c in all_comments(result.template)] == list(range(2, last_row + 1))


@pytest.mark.parametrize("export, sections_with_general", [("commercial", 7), ("residential", 8)])
def test_repeated_item_names_stay_separate_items_per_section(export, sections_with_general, request):
    _, result = request.getfixturevalue(export)

    holders = [s.name for s in result.template.sections if any(i.name == "General" for i in s.items)]
    assert len(holders) == sections_with_general


@pytest.mark.parametrize("export", ["commercial", "residential"])
def test_names_are_decoded_once_and_comment_html_is_kept_exactly(export, request):
    sheet, result = request.getfixturevalue(export)
    by_row = {row.number: row for row in sheet.rows}

    for section in result.template.sections:
        assert "&amp;" not in section.name
        for item in section.items:
            assert "&amp;" not in item.name
            for comment in item.comments:
                assert comment.text_html == by_row[comment.source_row].cells["Comment Text"]


@pytest.mark.parametrize("export, links", [("commercial", 28), ("residential", 33)])
def test_links_survive(export, links, request):
    _, result = request.getfixturevalue(export)

    assert sum(c.text_html.count("<a ") for c in all_comments(result.template)) == links


def test_two_comments_with_the_same_name_in_one_item_both_survive(residential):
    _, result = residential
    fireplace = next(s for s in result.template.sections if s.name == "Fireplace")
    dampers = next(i for i in fireplace.items if i.name == "Damper Doors")

    twins = [c for c in dampers.comments if c.name == "Damper Inoperable"]

    assert [c.source_row for c in twins] == [263, 264]
    assert twins[0].text_html != twins[1].text_html


def test_trailing_spaces_in_names_are_preserved(commercial):
    _, result = commercial

    names = {c.source_row: c.name for c in all_comments(result.template)}

    assert names[17] == "Discoloration "


def test_severity_is_read_from_category_on_defects(commercial):
    _, result = commercial

    assert Counter(c.severity for c in all_comments(result.template) if c.comment_type == "defect") == {
        0: 249,
        1: 17,
    }
    assert {c.severity for c in all_comments(result.template) if c.comment_type != "defect"} == {None}


def test_display_fields_are_read(residential):
    _, result = residential
    comments = {c.source_row: c for c in all_comments(result.template)}

    assert comments[126].default_value == "true"
    assert comments[126].answer_type == "boolean"
    assert comments[53].recommendation == "monitor"
    assert comments[196].options[:3] == ("Ecosmart", "AO Smith", "Heat Pump")


def test_every_source_cell_is_kept(commercial):
    sheet, result = commercial
    by_row = {row.number: row for row in sheet.rows}

    for comment in all_comments(result.template):
        assert comment.source_columns == by_row[comment.source_row].cells
        assert len(comment.source_columns) == 42


def test_the_real_exports_need_no_structural_notices(commercial, residential):
    for _, result in (commercial, residential):
        assert [i for i in result.issues if i.code in {"UNKNOWN_TYPE", "BLANK_SECTION", "BLANK_ITEM"}] == []
