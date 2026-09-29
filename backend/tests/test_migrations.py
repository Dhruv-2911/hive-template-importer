"""The schema comes from Alembic migrations only, and Supabase's auto-generated Data API can't read it.

See ADR-002.
"""

import uuid

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text

from app.models import Base
from tests.conftest import APP_TABLES, alembic_config


def test_migrations_create_every_table(migrated_engine):
    assert set(APP_TABLES) <= set(inspect(migrated_engine).get_table_names())


def test_row_level_security_is_on_for_every_table_including_alembics(migrated_engine):
    with migrated_engine.connect() as connection:
        rls = dict(
            connection.execute(
                text("select relname, relrowsecurity from pg_class where relname = any(:names)"),
                {"names": [*APP_TABLES, "alembic_version"]},
            ).all()
        )

    assert rls == {name: True for name in [*APP_TABLES, "alembic_version"]}


def test_a_role_that_does_not_own_the_tables_sees_no_rows(clean_db):
    probe = f"probe_{uuid.uuid4().hex[:8]}"
    with clean_db.begin() as connection:
        connection.execute(
            text("insert into templates (id, name, source_name) values (:id, 'T', 'T')"), {"id": uuid.uuid4()}
        )
        connection.execute(text(f"create role {probe} nologin"))
        connection.execute(text(f"grant usage on schema public to {probe}"))
        connection.execute(text(f"grant select on templates to {probe}"))
    try:
        with clean_db.begin() as connection:
            owner_sees = connection.execute(text("select count(*) from templates")).scalar_one()
            connection.execute(text(f"set local role {probe}"))
            probe_sees = connection.execute(text("select count(*) from templates")).scalar_one()
    finally:
        with clean_db.begin() as connection:
            connection.execute(text(f"drop owned by {probe}"))
            connection.execute(text(f"drop role {probe}"))

    assert (owner_sees, probe_sees) == (1, 0)


def test_the_models_match_the_migrations(migrated_engine):
    with migrated_engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)

    assert differences == []


def test_migrations_can_be_rolled_back_and_reapplied(database_url, migrated_engine):
    config = alembic_config(database_url)

    command.downgrade(config, "base")
    after_downgrade = set(inspect(migrated_engine).get_table_names())
    command.upgrade(config, "head")
    after_upgrade = set(inspect(migrated_engine).get_table_names())

    assert after_downgrade.isdisjoint(APP_TABLES)
    assert set(APP_TABLES) <= after_upgrade
