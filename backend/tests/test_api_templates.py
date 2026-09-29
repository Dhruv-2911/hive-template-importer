"""Reading templates back (SPEC.md US3): the list with counts, and one template's full tree in file order."""

from sqlalchemy.orm import sessionmaker

from app.seed import seed
from tests.conftest import COMMERCIAL_EXPORT


def seeded(clean_db):
    return seed(sessionmaker(clean_db, expire_on_commit=False), COMMERCIAL_EXPORT).template_id


def test_the_list_shows_each_template_with_its_counts(client, clean_db):
    template_id = seeded(clean_db)

    templates = client.get("/api/templates").json()

    assert len(templates) == 1
    assert templates[0]["id"] == str(template_id)
    assert templates[0]["is_sample"] is True
    assert templates[0]["counts"] == {"sections": 12, "items": 58, "comments": 346}


def test_a_template_comes_back_as_a_tree_in_file_order(client, clean_db):
    tree = client.get(f"/api/templates/{seeded(clean_db)}").json()

    assert tree["name"] == "InterNACHI Commercial Template-2026-09-28"
    assert [s["name"] for s in tree["sections"]][:3] == ["Inspection Details", "Roof", "Exterior"]
    rows = [c["source_row"] for s in tree["sections"] for i in s["items"] for c in i["comments"]]
    assert rows == list(range(2, 348))
    assert [s["position"] for s in tree["sections"]] == list(range(12))


def test_comments_carry_what_the_editor_shows(client, clean_db):
    tree = client.get(f"/api/templates/{seeded(clean_db)}").json()
    comments = {c["source_row"]: c for s in tree["sections"] for i in s["items"] for c in i["comments"]}

    defect = comments[11]
    assert defect["comment_type"] == "defect"
    assert defect["text_html"] == defect["source_text_html"]
    assert defect["severity"] in (0, 1)
    assert comments[2]["options"][:2] == ["Clear", "Hot"]
    assert "source_columns" not in defect  # kept in the database, not sent with every tree


def test_an_unknown_template_is_not_found(client):
    response = client.get("/api/templates/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_large_responses_are_compressed(client, clean_db):
    response = client.get(f"/api/templates/{seeded(clean_db)}", headers={"Accept-Encoding": "gzip"})

    assert response.headers["content-encoding"] == "gzip"
