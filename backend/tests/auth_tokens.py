"""Supabase-style access tokens for tests, signed with a key pair made for this test run (ADR-009).

The app under test is given the matching public key set through SUPABASE_JWKS, so no test talks to Supabase.
"""

import json
import time
import uuid
from typing import Any

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

SUPABASE_URL = "https://test-project.supabase.co"
ISSUER = f"{SUPABASE_URL}/auth/v1"
KEY_ID = "test-key"

_private_key = ec.generate_private_key(ec.SECP256R1())
_public_jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(_private_key.public_key()))
JWKS = {"keys": [{**_public_jwk, "kid": KEY_ID, "alg": "ES256", "use": "sig"}]}

AUTH_SETTINGS: dict[str, Any] = {
    "supabase_url": SUPABASE_URL,
    "supabase_publishable_key": "sb_publishable_test",
    "supabase_jwks": json.dumps(JWKS),
}

USER_ID = str(uuid.uuid4())


def claims(**overrides: Any) -> dict[str, Any]:
    """The claims Supabase puts in a signed-in user's access token."""
    now = int(time.time())
    return {
        "iss": ISSUER,
        "aud": "authenticated",
        "sub": USER_ID,
        "email": "inspector@example.com",
        "role": "authenticated",
        "is_anonymous": False,
        "iat": now,
        "exp": now + 3600,
        **overrides,
    }


def sign(payload: dict[str, Any], *, key: ec.EllipticCurvePrivateKey | None = None, kid: str = KEY_ID) -> str:
    return jwt.encode(payload, key or _private_key, algorithm="ES256", headers={"kid": kid})


def make_token(*, key: ec.EllipticCurvePrivateKey | None = None, kid: str = KEY_ID, **overrides: Any) -> str:
    return sign(claims(**overrides), key=key, kid=kid)


def auth_header(token: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token or make_token()}"}
