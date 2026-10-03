from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.auth_tokens import AUTH_SETTINGS


def make_export(root):
    """The files `next build` writes with output: 'export' and trailingSlash: true."""
    (root / "index.html").write_text("<p>home</p>")
    (root / "templates").mkdir()
    (root / "templates" / "index.html").write_text("<p>templates</p>")
    (root / "404.html").write_text("<p>not found</p>")
    return root


def test_serves_exported_pages_by_directory(tmp_path, database_url):
    client = TestClient(
        create_app(
            Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path)), **AUTH_SETTINGS)
        )
    )

    assert client.get("/").text == "<p>home</p>"
    assert client.get("/templates/").text == "<p>templates</p>"


def test_adds_the_trailing_slash_next_links_expect(tmp_path, database_url):
    client = TestClient(
        create_app(
            Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path)), **AUTH_SETTINGS)
        )
    )

    response = client.get("/templates", follow_redirects=False)

    assert response.status_code in (301, 307, 308)
    assert response.headers["location"].endswith("/templates/")


def test_unknown_paths_get_the_exported_404_page(tmp_path, database_url):
    client = TestClient(
        create_app(
            Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path)), **AUTH_SETTINGS)
        )
    )

    response = client.get("/no-such-page/")

    assert response.status_code == 404
    assert response.text == "<p>not found</p>"


def test_api_routes_are_not_shadowed_by_the_frontend(tmp_path, database_url):
    client = TestClient(
        create_app(
            Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path)), **AUTH_SETTINGS)
        )
    )

    assert client.get("/api/health").json() == {"status": "ok"}


def test_runs_without_a_frontend_build(tmp_path, database_url):
    missing = tmp_path / "not-built"
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(missing), **AUTH_SETTINGS))
    )

    assert client.get("/api/health").status_code == 200
    assert client.get("/").status_code == 404


def test_pages_are_checked_again_on_every_visit(tmp_path, database_url):
    # Without this, a browser can keep showing the previous deploy's pages for hours.
    client = TestClient(
        create_app(
            Settings(database_url=database_url, frontend_dir=str(make_export(tmp_path)), **AUTH_SETTINGS)
        )
    )

    for path in ("/", "/templates/"):
        assert client.get(path).headers["cache-control"] == "no-cache"


def test_build_files_with_a_hash_in_their_name_are_kept_for_a_year(tmp_path, database_url):
    root = make_export(tmp_path)
    (root / "_next" / "static" / "chunks").mkdir(parents=True)
    (root / "_next" / "static" / "chunks" / "app-3zo9lnpn.js").write_text("console.log(1)")
    client = TestClient(
        create_app(Settings(database_url=database_url, frontend_dir=str(root), **AUTH_SETTINGS))
    )

    response = client.get("/_next/static/chunks/app-3zo9lnpn.js")

    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
