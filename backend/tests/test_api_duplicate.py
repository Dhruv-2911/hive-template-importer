"""Duplicating a template (SPEC.md US5): a full, independent copy made in one transaction."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import RESIDENTIAL_EXPORT


@pytest.fixture
def original(client, residential_bytes):
    created = client.post(
        "/api/imports",
        files={"file": (RESIDENTIAL_EXPORT.name, residential_bytes, "application/vnd.ms-excel")},
    ).json()
    return client.get(f"/api/templates/{created['template_id']}").json()


def duplicate(client, template_id: str) -> dict:
    response = client.post(f"/api/templates/{template_id}/duplicate")
    assert response.status_code == 201
    return client.get(f"/api/templates/{response.json()['template_id']}").json()


def shape(tree: dict) -> list:
    """Everything about a tree except its ids."""
    return [
        (
            s["name"],
            s["source_name"],
            [
                (i["name"], [(c["source_row"], c["name"], c["text_html"]) for c in i["comments"]])
                for i in s["items"]
            ],
        )
        for s in tree["sections"]
    ]


def ids(tree: dict) -> set[str]:
    found = {tree["id"]}
    for section in tree["sections"]:
        found.add(section["id"])
        for item in section["items"]:
            found.add(item["id"])
            found.update(comment["id"] for comment in item["comments"])
    return found


def test_the_copy_has_everything_under_new_ids(client, original):
    copy = duplicate(client, original["id"])

    assert copy["name"] == f"{original['name']} (copy)"
    # The "(copy)" suffix isn't the inspector's edit, so a fresh copy's name isn't marked as edited.
    assert copy["source_name"] == copy["name"]
    assert copy["copied_from_id"] == original["id"]
    assert copy["import_run_id"] == original["import_run_id"]  # so the copy still reaches its import report
    assert copy["is_sample"] is False
    assert shape(copy) == shape(original)
    assert ids(copy).isdisjoint(ids(original))


def test_editing_the_copy_leaves_the_original_unchanged(client, original):
    copy = duplicate(client, original["id"])

    client.patch(f"/api/sections/{copy['sections'][2]['id']}", json={"name": "Roof (copy edit)"})
    client.patch(
        f"/api/comments/{copy['sections'][2]['items'][1]['comments'][0]['id']}",
        json={"text_html": "<p>Changed.</p>"},
    )

    assert shape(client.get(f"/api/templates/{original['id']}").json()) == shape(original)


def test_editing_the_original_leaves_the_copy_unchanged(client, original):
    copy = duplicate(client, original["id"])

    client.patch(f"/api/items/{original['sections'][0]['items'][0]['id']}", json={"name": "Original edit"})

    assert shape(client.get(f"/api/templates/{copy['id']}").json()) == shape(copy)


def test_a_copy_keeps_the_edits_made_before_it_was_copied(client, original):
    client.patch(f"/api/sections/{original['sections'][0]['id']}", json={"name": "Before copying"})

    copy = duplicate(client, original["id"])

    assert copy["sections"][0]["name"] == "Before copying"
    assert copy["sections"][0]["source_name"] == original["sections"][0]["source_name"]


def test_a_copy_can_be_copied(client, original):
    second = duplicate(client, duplicate(client, original["id"])["id"])

    assert second["name"] == f"{original['name']} (copy) (copy)"
    assert shape(second) == shape(original)


def test_copying_the_sample_does_not_make_a_second_sample(client, clean_db, original):
    with clean_db.begin() as connection:
        connection.execute(
            text("update templates set is_sample = true where id = :id"), {"id": original["id"]}
        )

    duplicate(client, original["id"])

    with clean_db.connect() as connection:
        assert connection.execute(text("select count(*) from templates where is_sample")).scalar_one() == 1


def test_copying_something_that_does_not_exist_is_not_found(client):
    response = client.post("/api/templates/00000000-0000-0000-0000-000000000000/duplicate")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_a_copy_that_fails_part_way_leaves_nothing_behind(make_client, clean_db, original):
    client = make_client()
    unsafe = TestClient(client.app, raise_server_exceptions=False)
    with clean_db.begin() as connection:
        connection.execute(
            text(
                "create function refuse_comments() returns trigger language plpgsql as"
                " $$ begin raise exception 'simulated failure'; end $$;"
                " create trigger refuse_comments before insert on comments"
                " for each row execute function refuse_comments();"
            )
        )
    try:
        response = unsafe.post(f"/api/templates/{original['id']}/duplicate")
    finally:
        with clean_db.begin() as connection:
            connection.execute(
                text("drop trigger refuse_comments on comments; drop function refuse_comments();")
            )

    assert response.status_code == 500
    with clean_db.connect() as connection:
        assert connection.execute(text("select count(*) from templates")).scalar_one() == 1
        assert connection.execute(text("select count(*) from sections")).scalar_one() == 12


def test_the_copy_is_made_inside_the_database_in_a_fixed_number_of_statements(client, original):
    # Copying row by row through the app sent ~1 MB of comments each way and took 9.5 s against Supabase.
    from sqlalchemy import event

    statements: list[str] = []
    engine = client.app.state.engine
    listener = lambda conn, cursor, statement, *args: statements.append(statement)  # noqa: E731
    event.listen(engine, "before_cursor_execute", listener)
    try:
        duplicate(client, original["id"])
    finally:
        event.remove(engine, "before_cursor_execute", listener)

    copy_statements = [s for s in statements if s.lstrip().upper().startswith(("INSERT", "SELECT"))]
    # template lookup + template insert + one INSERT ... SELECT per level + the tree read by duplicate() above
    assert len(copy_statements) <= 10
    assert not any(
        s.lstrip().upper().startswith("SELECT") and "source_columns" in s for s in copy_statements[:5]
    )
