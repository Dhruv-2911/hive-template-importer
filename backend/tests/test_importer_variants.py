"""Exports that differ from the two committed files in ways a real Spectora export might."""

from app.importer.pipeline import import_export
from tests.fixtures import make_fixtures as fx

REQUIRED = ["Section Name", "Item Name", "Comment Name", "Comment Text", "Comment Type (info, limit, defect)"]


def comments_of(imported):
    return [c for s in imported.template.sections for i in s.items for c in i.comments]


def test_columns_in_a_different_order_are_read_by_name():
    data = fx.xlsx(
        [
            [
                "Comment Type (info, limit, defect)",
                "Comment Text",
                "Item Name",
                "Comment Name",
                "Section Name",
            ],
            ["defect", "<p>Cracked.</p>", "Siding", "Cracked", "Exterior"],
        ]
    )

    comment = comments_of(import_export(data, filename="x.xlsx"))[0]

    assert (comment.comment_type, comment.name, comment.text_html) == ("defect", "Cracked", "<p>Cracked.</p>")


def test_only_the_required_columns_is_enough():
    data = fx.xlsx([REQUIRED, ["Roof", "Coverings", "Worn", "text", "defect"]])

    imported = import_export(data, filename="x.xlsx")

    assert imported.report.reconciliation.comments_imported == 1
    assert comments_of(imported)[0].severity is None


def test_header_case_and_spacing_do_not_matter():
    data = fx.xlsx([[f"  {h.upper()} " for h in REQUIRED], ["Roof", "Coverings", "Worn", "text", "defect"]])

    assert import_export(data, filename="x.xlsx").report.reconciliation.comments_imported == 1


def test_a_column_spectora_might_add_later_is_kept_and_flagged():
    data = fx.xlsx([[*REQUIRED, "Inspector Notes"], ["Roof", "Coverings", "Worn", "text", "defect", "check"]])

    imported = import_export(data, filename="x.xlsx")

    assert comments_of(imported)[0].source_columns["Inspector Notes"] == "check"
    assert [(n.row, n.code) for n in imported.report.notices] == [(2, "UNMODELLED_VALUE")]
    assert "Inspector Notes" in imported.report.notices[0].message


def test_a_filled_photo_column_is_flagged():
    data = fx.xlsx(
        [[*REQUIRED, "Default Photo 1"], ["Roof", "Coverings", "Worn", "text", "defect", "photo.jpg"]]
    )

    assert [n.code for n in import_export(data, filename="x.xlsx").report.notices] == ["UNMODELLED_VALUE"]


def test_text_stored_in_the_sheet_itself_is_read_like_spectora_writes_it():
    data = fx.hand_written_xlsx(
        [REQUIRED, ["Roof", "Coverings", "Worn &amp; torn", "<p>A &amp; B</p>", "defect"]]
    )

    comment = comments_of(import_export(data, filename="x.xlsx"))[0]

    assert comment.name == "Worn & torn"
    assert comment.text_html == "<p>A &amp; B</p>"


def test_inline_strings_are_read():
    data = fx.hand_written_xlsx(
        [REQUIRED, ["Roof", "Coverings", "Worn", "text", "defect"]], cell_type="inlineStr"
    )

    assert import_export(data, filename="x.xlsx").report.reconciliation.comments_imported == 1


def test_only_the_first_sheet_is_read_and_the_others_are_named():
    data = fx.hand_written_xlsx([REQUIRED, ["Roof", "Coverings", "Worn", "text", "defect"]], extra_sheets=1)

    assert import_export(data, filename="x.xlsx").report.reconciliation.sheets_not_read == ["Sheet2"]


def test_rich_html_is_kept_exactly_and_a_real_embed_is_not_flagged():
    html = (
        "<p><strong>Bold</strong> and <em>italic</em></p><ul><li>one</li></ul>"
        '<p><img src="https://example.com/a.png"></p>'
        '<div class="youtube-embed-wrapper"><iframe src="https://www.youtube.com/embed/x"></iframe></div>'
    )
    data = fx.xlsx([REQUIRED, ["Roof", "Coverings", "Worn", html, "defect"]])

    imported = import_export(data, filename="x.xlsx")

    assert comments_of(imported)[0].text_html == html
    assert imported.report.notices == ()


def test_blank_rows_are_reported():
    data = fx.xlsx(
        [
            REQUIRED,
            ["Roof", "Coverings", "One", "t", "info"],
            [None] * 5,
            ["Roof", "Coverings", "Two", "t", "info"],
        ]
    )

    assert import_export(data, filename="x.xlsx").report.reconciliation.blank_rows == [3]


def test_a_filename_without_an_extension_or_with_a_path_still_names_the_template():
    data = fx.minimal_export()

    assert import_export(data, filename="C:\\Users\\me\\My Template").template.name == "My Template"
    assert import_export(data, filename="").template.name == "Imported template"
