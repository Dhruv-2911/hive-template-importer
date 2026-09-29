import os
from pathlib import Path

import pytest

# The compose file creates this database next to the app's own (docker compose up -d db).
DEFAULT_TEST_DATABASE_URL = "postgresql://hive:hive@localhost:5433/hive_test"


@pytest.fixture(scope="session")
def database_url() -> str:
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


REPO_ROOT = Path(__file__).resolve().parents[2]
COMMERCIAL_EXPORT = REPO_ROOT / "InterNACHI Commercial Template-2026-09-28.xls"
RESIDENTIAL_EXPORT = REPO_ROOT / "InterNACHI Residential -2026-09-28.xls"


@pytest.fixture(scope="session")
def commercial_bytes() -> bytes:
    return COMMERCIAL_EXPORT.read_bytes()


@pytest.fixture(scope="session")
def residential_bytes() -> bytes:
    return RESIDENTIAL_EXPORT.read_bytes()
