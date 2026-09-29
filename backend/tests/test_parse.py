"""Parsing decisions on small invented exports: each decision is visible in the result."""

from app.importer.parse import parse_sheet
from app.importer.workbook import read_workbook
from tests.fixtures import make_fixtures as fx


def parse(rows):
    return parse_sheet(read_workbook(fx.spectora_export(rows)), template_name="Sample")


def test_the_template_is_named_by_the_caller():
    assert parse([["A", "B", "C", "text", "info"]]).template.name == "Sample"


def test_an_unknown_comment_type_is_kept_as_unknown_and_flagged():
    result = parse([["Area", "Thing", "Odd one", "text", "observation"]])

    comment = result.template.sections[0].items[0].comments[0]
    assert comment.comment_type == "unknown"
    assert comment.source_type == "observation"
    assert [(i.row, i.code) for i in result.issues] == [(2, "UNKNOWN_TYPE")]


def test_comment_type_is_read_regardless_of_case_and_padding():
    result = parse([["Area", "Thing", "Note", "text", " Defect "]])

    assert result.template.sections[0].items[0].comments[0].comment_type == "defect"
    assert result.issues == ()


def test_a_blank_section_name_is_kept_under_a_placeholder_and_flagged():
    result = parse([[None, "Thing", "Note", "text", "info"]])

    assert result.template.sections[0].name == "(blank section)"
    assert [(i.row, i.code) for i in result.issues] == [(2, "BLANK_SECTION")]


def test_a_blank_item_name_is_kept_under_a_placeholder_and_flagged():
    result = parse([["Area", "  ", "Note", "text", "info"]])

    assert result.template.sections[0].items[0].name == "(blank item)"
    assert [(i.row, i.code) for i in result.issues] == [(2, "BLANK_ITEM")]


def test_a_section_that_reappears_later_stays_a_separate_section_in_file_order():
    result = parse(
        [
            ["Roof", "Covering", "One", "text", "info"],
            ["Exterior", "Siding", "Two", "text", "info"],
            ["Roof", "Covering", "Three", "text", "info"],
        ]
    )

    assert [s.name for s in result.template.sections] == ["Roof", "Exterior", "Roof"]
    assert [c.source_row for s in result.template.sections for i in s.items for c in i.comments] == [2, 3, 4]


def test_a_category_outside_minus_one_to_one_is_shown_empty_and_flagged():
    result = parse([["Area", "Thing", "Note", "text", "defect", "high"]])

    comment = result.template.sections[0].items[0].comments[0]
    assert comment.severity is None
    assert comment.source_columns["Category (-1: Low, 0: Med, 1: High)"] == "high"
    assert [(i.row, i.code) for i in result.issues] == [(2, "VALUE_NOT_UNDERSTOOD")]


def test_options_are_split_on_commas_after_decoding():
    result = parse([["Area", "Thing", "Brand", "", "info", None, "Acme &amp; Sons, Other ,  Last"]])

    assert result.template.sections[0].items[0].comments[0].options == ("Acme & Sons", "Other", "Last")


def test_empty_optional_fields_read_as_none():
    comment = parse([["Area", "Thing", "Note", "text", "info"]]).template.sections[0].items[0].comments[0]

    assert (comment.severity, comment.recommendation, comment.answer_type, comment.default_value) == (
        None,
        None,
        None,
        None,
    )
    assert comment.options == ()
