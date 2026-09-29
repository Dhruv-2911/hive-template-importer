from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_export(root):
    """The files `next build` writes with output: 'export' and trailingSlash: true."""
    (root / "index.html").write_text("<p>home</p>")
    (root / "templates").mkdir()
    (root / "templates" / "index.html").write_text("<p>templates</p>")
    (root / "404.html").write_text("<p>not found</p>")
    return root


def test_serves_exported_pages_by_directory(tmp_path, database_url):
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path))))
    )

    assert client.get("/").text == "<p>home</p>"
    assert client.get("/templates/").text == "<p>templates</p>"


def test_adds_the_trailing_slash_next_links_expect(tmp_path, database_url):
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path))))
    )

    response = client.get("/templates", follow_redirects=False)

    assert response.status_code in (301, 307, 308)
    assert response.headers["location"].endswith("/templates/")


def test_unknown_paths_get_the_exported_404_page(tmp_path, database_url):
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path))))
    )

    response = client.get("/no-such-page/")

    assert response.status_code == 404
    assert response.text == "<p>not found</p>"


def test_api_routes_are_not_shadowed_by_the_frontend(tmp_path, database_url):
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path))))
    )

    assert client.get("/api/health").json() == {"status": "ok"}


def test_runs_without_a_frontend_build(tmp_path, database_url):
    missing = tmp_path / "not-built"
    client = TestClient(create_app(Settings(database_url=database_url, frontend_dir=str(missing))))

    assert client.get("/api/health").status_code == 200
    assert client.get("/").status_code == 404
