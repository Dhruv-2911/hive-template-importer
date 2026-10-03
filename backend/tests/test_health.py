from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.auth_tokens import AUTH_SETTINGS


def test_health_reports_ok_when_the_database_answers(database_url):
    client = TestClient(create_app(Settings(database_url=database_url, **AUTH_SETTINGS)))

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_reports_unavailable_when_the_database_is_unreachable():
    unreachable = "postgresql://nobody:nothing@127.0.0.1:1/none"
    client = TestClient(create_app(Settings(database_url=unreachable, **AUTH_SETTINGS)))

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
