"""POST /api/imports saves a verified template or saves nothing (SPEC.md US1, US2, US6; ADR-006)."""

import hashlib

import pytest
from sqlalchemy import text

from tests.conftest import COMMERCIAL_EXPORT, RESIDENTIAL_EXPORT
from tests.fixtures import make_fixtures as fx


def upload(client, data: bytes, filename: str = "export.xls"):
    return client.post("/api/imports", files={"file": (filename, data, "application/vnd.ms-excel")})


def count(engine, table: str) -> int:
    with engine.connect() as connection:
        return connection.execute(text(f"select count(*) from {table}")).scalar_one()


def test_importing_the_commercial_export_saves_the_whole_template(client, clean_db, commercial_bytes):
    response = upload(client, commercial_bytes, COMMERCIAL_EXPORT.name)

    assert response.status_code == 201
    report = response.json()["report"]
    assert report["reconciliation"]["comments_imported"] == 346
    assert report["verification"] == {"checked": 346, "matched": 346, "mismatches": []}
    assert [count(clean_db, t) for t in ("templates", "sections", "items", "comments")] == [1, 12, 58, 346]


def test_importing_the_residential_export_is_verified_too(client, clean_db, residential_bytes):
    response = upload(client, residential_bytes, RESIDENTIAL_EXPORT.name)

    assert response.status_code == 201
    assert response.json()["report"]["verification"]["matched"] == 366
    assert count(clean_db, "comments") == 366


def test_stored_comments_keep_file_order_and_exact_text(client, clean_db, commercial_bytes):
    upload(client, commercial_bytes, COMMERCIAL_EXPORT.name)

    with clean_db.connect() as connection:
        rows = connection.execute(
            text(
                "select c.source_row, c.text_html, c.source_text_html,"
                " c.source_columns->>'Comment Text', s.name"
                " from comments c join items i on i.id = c.item_id join sections s on s.id = i.section_id"
                " order by s.position, i.position, c.position"
            )
        ).all()

    assert [row[0] for row in rows] == list(range(2, 348))
    assert all(row[1] == row[2] == row[3] for row in rows)
    assert rows[-1][4] == "Doors, Windows & Interior"


def test_the_import_run_keeps_the_original_file(client, clean_db, commercial_bytes):
    run_id = upload(client, commercial_bytes, COMMERCIAL_EXPORT.name).json()["import_run_id"]

    download = client.get(f"/api/imports/{run_id}/file")

    assert download.status_code == 200
    assert download.content == commercial_bytes
    assert "InterNACHI%20Commercial%20Template-2026-09-28.xls" in download.headers["content-disposition"]
    with clean_db.connect() as connection:
        stored_hash = connection.execute(text("select file_sha256 from import_runs")).scalar_one()
    assert stored_hash == hashlib.sha256(commercial_bytes).hexdigest()


def test_the_report_can_be_read_back_with_its_template(client, commercial_bytes):
    created = upload(client, commercial_bytes, COMMERCIAL_EXPORT.name).json()

    run = client.get(f"/api/imports/{created['import_run_id']}").json()

    assert run["status"] == "succeeded"
    assert run["template_id"] == created["template_id"]
    assert run["report"] == created["report"]


REJECTIONS = [
    (fx.pdf, "NOT_A_SPREADSHEET"),
    (fx.legacy_xls, "LEGACY_XLS"),
    (fx.unrelated_spreadsheet, "NOT_A_SPECTORA_EXPORT"),
    (fx.headers_only_export, "EMPTY_EXPORT"),
    (fx.truncated_xlsx, "UNREADABLE_WORKBOOK"),
]


@pytest.mark.parametrize("make_file, code", REJECTIONS, ids=[code for _, code in REJECTIONS])
def test_a_rejected_upload_writes_no_template_and_records_why(client, clean_db, make_file, code):
    response = upload(client, make_file())

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == code
    assert error["message"]
    assert error["details"]["import_run_id"]
    assert [count(clean_db, t) for t in ("templates", "sections", "items", "comments")] == [0, 0, 0, 0]
    with clean_db.connect() as connection:
        assert connection.execute(text("select status, error_code from import_runs")).one() == (
            "failed",
            code,
        )


def test_an_upload_over_the_limit_is_rejected_without_storing_it(make_client, clean_db):
    data = fx.minimal_export()
    client = make_client(max_upload_mb=0.001)

    response = upload(client, data)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert response.json()["error"]["details"]["size_bytes"] == len(data)
    with clean_db.connect() as connection:
        assert connection.execute(text("select file_bytes from import_runs")).scalar_one() is None


def test_a_mismatch_found_by_verification_rolls_the_whole_import_back(client, clean_db, commercial_bytes):
    # A trigger that silently shortens comment text on insert: the kind of loss verification exists to catch.
    with clean_db.begin() as connection:
        connection.execute(
            text(
                "create function shorten_text() returns trigger language plpgsql as"
                " $$ begin new.text_html := left(new.text_html, 20); return new; end $$;"
                " create trigger shorten_text before insert on comments"
                " for each row execute function shorten_text();"
            )
        )
    try:
        response = upload(client, commercial_bytes, COMMERCIAL_EXPORT.name)
    finally:
        with clean_db.begin() as connection:
            connection.execute(text("drop trigger shorten_text on comments; drop function shorten_text();"))

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VERIFICATION_FAILED"
    # 271 comments have more than 20 characters of text; the first is on row 11.
    # The list of mismatches is capped; the count is not.
    assert error["details"]["mismatched_comments"] == 271
    assert error["details"]["mismatches"][0] == {"row": 11, "field": "text_html"}
    assert [count(clean_db, t) for t in ("templates", "sections", "items", "comments")] == [0, 0, 0, 0]
    with clean_db.connect() as connection:
        assert (
            connection.execute(text("select error_code from import_runs")).scalar_one()
            == "VERIFICATION_FAILED"
        )


def test_an_unknown_import_run_is_not_found(client):
    response = client.get("/api/imports/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_a_request_without_a_file_gets_the_standard_error_shape(client):
    response = client.post("/api/imports")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_verification_also_catches_a_section_renamed_on_the_way_in(client, clean_db, residential_bytes):
    with clean_db.begin() as connection:
        connection.execute(
            text(
                "create function rename_section() returns trigger language plpgsql as"
                " $$ begin if new.position = 2 then new.name := new.name || ' (changed)'; end if;"
                " return new; end $$;"
                " create trigger rename_section before insert on sections"
                " for each row execute function rename_section();"
            )
        )
    try:
        response = upload(client, residential_bytes, RESIDENTIAL_EXPORT.name)
    finally:
        with clean_db.begin() as connection:
            connection.execute(
                text("drop trigger rename_section on sections; drop function rename_section();")
            )

    details = response.json()["error"]["details"]
    # Residential's third section is Roof: 35 comments, all reported under "section" and nothing else.
    assert details["mismatched_comments"] == 35
    assert {m["field"] for m in details["mismatches"]} == {"section"}
    assert count(clean_db, "templates") == 0


def test_an_import_takes_a_fixed_number_of_statements(client, residential_bytes):
    # Without render_nulls the ORM split 366 comments into 127 INSERTs (one per run of rows with the same
    # empty fields), and every one was a round trip to Supabase.
    from sqlalchemy import event

    statements: list[str] = []
    engine = client.app.state.engine
    listener = lambda conn, cursor, statement, *args: statements.append(statement)  # noqa: E731
    event.listen(engine, "before_cursor_execute", listener)
    try:
        assert upload(client, residential_bytes, RESIDENTIAL_EXPORT.name).status_code == 201
    finally:
        event.remove(engine, "before_cursor_execute", listener)

    assert len([s for s in statements if s.lstrip().upper().startswith("INSERT INTO COMMENTS")]) == 1
    assert len(statements) <= 12
