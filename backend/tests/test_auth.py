"""Every data route needs a valid Supabase access token (SPEC.md US8, ADR-009)."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.auth_tokens import AUTH_SETTINGS, SUPABASE_URL, auth_header, claims, make_token, sign

PROTECTED = [
    ("get", "/api/templates"),
    ("get", "/api/templates/00000000-0000-0000-0000-000000000000"),
    ("patch", "/api/templates/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/templates/00000000-0000-0000-0000-000000000000/duplicate"),
    ("patch", "/api/sections/00000000-0000-0000-0000-000000000000"),
    ("patch", "/api/items/00000000-0000-0000-0000-000000000000"),
    ("patch", "/api/comments/00000000-0000-0000-0000-000000000000"),
    ("post", "/api/imports"),
    ("get", "/api/imports/00000000-0000-0000-0000-000000000000"),
    ("get", "/api/imports/00000000-0000-0000-0000-000000000000/file"),
]


@pytest.fixture
def anonymous(make_client) -> TestClient:
    return make_client(signed_in=False)


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_every_data_route_refuses_a_request_without_a_token(anonymous, method, path):
    response = anonymous.request(method, path)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"
    assert response.headers["www-authenticate"] == "Bearer"


def test_a_valid_token_gets_through(anonymous):
    response = anonymous.get("/api/templates", headers=auth_header())

    assert response.status_code == 200


@pytest.mark.parametrize(
    "token",
    [
        pytest.param(make_token(exp=int(time.time()) - 60), id="expired"),
        pytest.param(make_token(aud="anon"), id="wrong audience"),
        pytest.param(make_token(iss="https://other-project.supabase.co/auth/v1"), id="another project"),
        pytest.param(make_token(is_anonymous=True), id="anonymous user"),
        pytest.param(make_token(key=ec.generate_private_key(ec.SECP256R1())), id="signed with another key"),
        pytest.param(make_token(kid="unknown-key"), id="unknown key id"),
        pytest.param(
            jwt.encode(claims(), "a guessed shared secret, 32+ bytes long", algorithm="HS256"),
            id="HS256 with a guessed secret",
        ),
        pytest.param(jwt.encode(claims(), None, algorithm="none"), id="unsigned"),
        pytest.param("not-a-token", id="garbage"),
    ],
)
def test_a_bad_token_is_refused(anonymous, token):
    response = anonymous.get("/api/templates", headers=auth_header(token))

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_a_token_without_a_subject_is_refused(anonymous):
    token = sign({name: value for name, value in claims().items() if name != "sub"})

    assert anonymous.get("/api/templates", headers=auth_header(token)).status_code == 401


@pytest.mark.parametrize("header", ["Basic dXNlcjpwYXNz", "Bearer", "Bearer ", "Token abc"])
def test_a_malformed_authorization_header_is_refused(anonymous, header):
    response = anonymous.get("/api/templates", headers={"Authorization": header})

    assert response.status_code == 401


def test_health_stays_public_for_the_uptime_monitor(anonymous):
    assert anonymous.get("/api/health").status_code == 200


def test_the_browser_gets_the_public_sign_in_config_without_a_token(anonymous):
    response = anonymous.get("/api/auth/config")

    assert response.status_code == 200
    assert response.json() == {
        "supabase_url": SUPABASE_URL,
        "supabase_publishable_key": "sb_publishable_test",
    }


@pytest.mark.parametrize("missing", ["supabase_url", "supabase_publishable_key"])
def test_the_app_refuses_to_start_without_its_sign_in_settings(database_url, missing):
    settings = Settings(database_url=database_url, **{**AUTH_SETTINGS, missing: ""})

    with pytest.raises(RuntimeError, match="SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY"):
        create_app(settings)


def test_keys_are_fetched_from_the_project_when_no_fixed_set_is_given(database_url):
    settings = Settings(database_url=database_url, **{**AUTH_SETTINGS, "supabase_jwks": ""})

    verifier = create_app(settings).state.verifier

    assert verifier.jwks_url == f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
