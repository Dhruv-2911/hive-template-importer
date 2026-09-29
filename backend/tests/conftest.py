import os
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, text

from app.db import make_engine

# The compose file creates this database next to the app's own (docker compose up -d db).
DEFAULT_TEST_DATABASE_URL = "postgresql://hive:hive@localhost:5433/hive_test"


BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_TABLES = ("import_runs", "templates", "sections", "items", "comments")


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)
    # The suite drops and recreates the schema. Refuse anything that isn't clearly a test database, so a
    # mistyped TEST_DATABASE_URL can never wipe development or production data.
    if not urlsplit(url).path.lstrip("/").endswith("_test"):
        raise RuntimeError(
            f"TEST_DATABASE_URL must name a database ending in _test, got {urlsplit(url).path!r}"
        )
    return url


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = database_url
    return config


@pytest.fixture(scope="session")
def migrated_engine(database_url) -> Engine:
    engine = make_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    command.upgrade(alembic_config(database_url), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def clean_db(migrated_engine) -> Engine:
    """An empty, migrated database for one test."""
    with migrated_engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {', '.join(APP_TABLES)} CASCADE"))
    return migrated_engine


REPO_ROOT = Path(__file__).resolve().parents[2]
COMMERCIAL_EXPORT = REPO_ROOT / "InterNACHI Commercial Template-2026-09-28.xls"
RESIDENTIAL_EXPORT = REPO_ROOT / "InterNACHI Residential -2026-09-28.xls"


@pytest.fixture(scope="session")
def commercial_bytes() -> bytes:
    return COMMERCIAL_EXPORT.read_bytes()


@pytest.fixture(scope="session")
def residential_bytes() -> bytes:
    return RESIDENTIAL_EXPORT.read_bytes()
