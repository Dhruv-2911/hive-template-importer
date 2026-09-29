"""Renaming a template, section, item or comment (SPEC.md US4). The imported value is never changed."""

import pytest
from sqlalchemy import text

from tests.conftest import RESIDENTIAL_EXPORT


@pytest.fixture
def tree(client, residential_bytes):
    created = client.post(
        "/api/imports",
        files={"file": (RESIDENTIAL_EXPORT.name, residential_bytes, "application/vnd.ms-excel")},
    ).json()
    return client.get(f"/api/templates/{created['template_id']}").json()


def stored(engine, table: str, id_: str) -> dict:
    with engine.connect() as connection:
        return dict(
            connection.execute(text(f"select * from {table} where id = :id"), {"id": id_}).mappings().one()
        )


def test_renaming_a_section_is_saved_and_keeps_the_imported_name(client, clean_db, tree):
    roof = tree["sections"][2]

    response = client.patch(f"/api/sections/{roof['id']}", json={"name": "Roof & Gutters"})

    assert response.status_code == 200
    assert response.json()["name"] == "Roof & Gutters"
    row = stored(clean_db, "sections", roof["id"])
    assert (row["name"], row["source_name"]) == ("Roof & Gutters", "Roof")


def test_renaming_an_item_is_saved_and_keeps_the_imported_name(client, clean_db, tree):
    item = tree["sections"][2]["items"][1]

    client.patch(f"/api/items/{item['id']}", json={"name": "Roof coverings"})

    row = stored(clean_db, "items", item["id"])
    assert (row["name"], row["source_name"]) == ("Roof coverings", item["source_name"])


def test_renaming_a_comment_records_when_it_was_edited(client, clean_db, tree):
    comment = tree["sections"][2]["items"][1]["comments"][0]

    response = client.patch(f"/api/comments/{comment['id']}", json={"name": "Shingles worn"})

    assert response.json()["name"] == "Shingles worn"
    assert response.json()["edited_at"] is not None
    row = stored(clean_db, "comments", comment["id"])
    assert (row["name"], row["source_name"]) == ("Shingles worn", comment["source_name"])
    assert row["text_html"] == row["source_text_html"]  # renaming leaves the text alone


def test_renaming_the_template_shows_in_the_list(client, tree):
    client.patch(f"/api/templates/{tree['id']}", json={"name": "Residential (Acme Inspections)"})

    listed = {t["id"]: t for t in client.get("/api/templates").json()}[tree["id"]]
    assert (listed["name"], listed["source_name"]) == ("Residential (Acme Inspections)", tree["source_name"])


def test_any_edit_moves_the_templates_updated_time(client, clean_db, tree):
    before = stored(clean_db, "templates", tree["id"])["updated_at"]

    client.patch(f"/api/items/{tree['sections'][0]['items'][0]['id']}", json={"name": "Overview"})

    assert stored(clean_db, "templates", tree["id"])["updated_at"] > before


def test_an_edit_survives_a_fresh_read(client, tree):
    section = tree["sections"][5]
    client.patch(f"/api/sections/{section['id']}", json={"name": "Cooling systems"})

    reread = client.get(f"/api/templates/{tree['id']}").json()

    assert reread["sections"][5]["name"] == "Cooling systems"
    assert reread["sections"][5]["source_name"] == section["source_name"]


@pytest.mark.parametrize("name", ["", "   "])
def test_a_blank_name_is_refused(client, tree, name):
    response = client.patch(f"/api/sections/{tree['sections'][0]['id']}", json={"name": name})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NAME_REQUIRED"


def test_an_overlong_name_is_refused(client, tree):
    response = client.patch(f"/api/items/{tree['sections'][0]['items'][0]['id']}", json={"name": "x" * 201})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NAME_TOO_LONG"


@pytest.mark.parametrize("kind", ["templates", "sections", "items", "comments"])
def test_renaming_something_that_does_not_exist_is_not_found(client, kind):
    response = client.patch(f"/api/{kind}/00000000-0000-0000-0000-000000000000", json={"name": "Anything"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_editing_comment_text_saves_cleaned_html_and_keeps_the_original(client, clean_db, tree):
    comment = tree["sections"][2]["items"][1]["comments"][1]
    new_text = "<p>Shingles are <strong>worn</strong>.</p><script>alert(1)</script>"

    response = client.patch(f"/api/comments/{comment['id']}", json={"text_html": new_text})

    assert response.status_code == 200
    saved = response.json()["text_html"]
    assert "<strong>worn</strong>" in saved and "<script" not in saved
    row = stored(clean_db, "comments", comment["id"])
    assert row["text_html"] == saved
    assert row["source_text_html"] == comment["source_text_html"]
    assert row["name"] == comment["name"]  # editing the text leaves the name alone


def test_comment_text_can_be_emptied(client, tree):
    comment = tree["sections"][2]["items"][1]["comments"][1]

    response = client.patch(f"/api/comments/{comment['id']}", json={"text_html": ""})

    assert response.json()["text_html"] == ""


def test_overlong_comment_text_is_refused(client, tree):
    comment = tree["sections"][2]["items"][1]["comments"][1]

    response = client.patch(f"/api/comments/{comment['id']}", json={"text_html": "x" * 50_001})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "TEXT_TOO_LONG"
