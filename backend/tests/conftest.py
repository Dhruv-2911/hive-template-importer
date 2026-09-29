import os

import pytest

# The compose file creates this database next to the app's own (docker compose up -d db).
DEFAULT_TEST_DATABASE_URL = "postgresql://hive:hive@localhost:5433/hive_test"


@pytest.fixture(scope="session")
def database_url() -> str:
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)
