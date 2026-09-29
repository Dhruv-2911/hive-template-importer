"""The sample template the live app opens on (SPEC.md US7): seeded once, replaceable only by the operator."""

import uuid

from sqlalchemy import select, text
from sqlalchemy.orm import sessionmaker

from app.models import Template
from app.seed import main, seed
from tests.conftest import COMMERCIAL_EXPORT, RESIDENTIAL_EXPORT


def samples(engine) -> list[Template]:
    with sessionmaker(engine)() as session:
        return list(session.scalars(select(Template).where(Template.is_sample)))


def test_seeding_imports_the_sample_once(clean_db):
    sessions = sessionmaker(clean_db, expire_on_commit=False)

    first = seed(sessions, COMMERCIAL_EXPORT)
    second = seed(sessions, COMMERCIAL_EXPORT)

    assert first.action == "imported"
    assert second.action == "kept"
    assert [t.id for t in samples(clean_db)] == [first.template_id]
    assert second.template_id == first.template_id


def test_the_sample_goes_through_the_same_verified_import(clean_db):
    result = seed(sessionmaker(clean_db, expire_on_commit=False), COMMERCIAL_EXPORT)

    assert result.verified == (346, 346)
    with clean_db.connect() as connection:
        assert connection.execute(text("select count(*) from comments")).scalar_one() == 346


def test_reset_replaces_only_the_sample(clean_db):
    sessions = sessionmaker(clean_db, expire_on_commit=False)
    old = seed(sessions, COMMERCIAL_EXPORT)
    other = seed(sessions, RESIDENTIAL_EXPORT, reset=False)  # a sample already exists, so this keeps it
    assert other.action == "kept"
    copy_id = uuid.uuid4()
    with clean_db.begin() as connection:
        connection.execute(
            text(
                "insert into templates (id, name, source_name, copied_from_id)"
                " values (:id, 'Copy', 'Copy', :src)"
            ),
            {"id": copy_id, "src": old.template_id},
        )

    new = seed(sessions, COMMERCIAL_EXPORT, reset=True)

    assert new.action == "replaced"
    assert new.deleted_template_id == old.template_id
    assert [t.id for t in samples(clean_db)] == [new.template_id]
    with clean_db.connect() as connection:
        copied_from = connection.execute(
            text("select copied_from_id from templates where id = :id"), {"id": copy_id}
        ).scalar_one()
        runs = connection.execute(text("select count(*) from import_runs")).scalar_one()
    assert copied_from is None  # the copy survives; it just no longer points at the deleted sample
    assert runs == 2  # import history is kept


def test_reset_with_no_sample_simply_imports_one(clean_db):
    result = seed(sessionmaker(clean_db, expire_on_commit=False), COMMERCIAL_EXPORT, reset=True)

    assert result.action == "imported"
    assert len(samples(clean_db)) == 1


def test_a_failed_reset_leaves_the_old_sample_in_place(clean_db, tmp_path):
    sessions = sessionmaker(clean_db, expire_on_commit=False)
    old = seed(sessions, COMMERCIAL_EXPORT)
    broken = tmp_path / "broken.xls"
    broken.write_bytes(b"not a spreadsheet")

    result = seed(sessions, broken, reset=True)

    assert result.action == "rejected"
    assert [t.id for t in samples(clean_db)] == [old.template_id]


def test_the_command_exits_non_zero_when_the_sample_cannot_be_imported(
    clean_db, database_url, tmp_path, capsys
):
    broken = tmp_path / "broken.xls"
    broken.write_bytes(b"not a spreadsheet")

    code = main(["--file", str(broken)], database_url=database_url)

    assert code == 1
    assert "NOT_A_SPREADSHEET" in capsys.readouterr().out
