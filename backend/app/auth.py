"""Checks the Supabase access token on every data request (SPEC.md US8, ADR-009).

Tokens are verified here, against the project's published public keys, so no request waits on Supabase.
"""

import json
import logging
from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError

from app.api_errors import ApiError

logger = logging.getLogger(__name__)

# Asymmetric only. Accepting HS256 would let anyone who guesses or leaks a shared secret mint tokens.
ALGORITHMS = ["ES256", "RS256"]


@dataclass(frozen=True)
class User:
    id: str
    email: str | None


class TokenVerifier:
    def __init__(self, supabase_url: str, fixed_jwks: str = "") -> None:
        self.issuer = f"{supabase_url.rstrip('/')}/auth/v1"
        self.jwks_url = f"{self.issuer}/.well-known/jwks.json"
        self._fixed = jwt.PyJWKSet.from_dict(json.loads(fixed_jwks)) if fixed_jwks else None
        # Fetched on the first request, then cached. A token signed with an unknown key id triggers a
        # refetch, so a key rotated in Supabase is picked up without a restart.
        self._client = None if self._fixed else jwt.PyJWKClient(self.jwks_url, cache_keys=True, timeout=5)

    def _signing_key(self, token: str) -> jwt.PyJWK:
        if self._client:
            return self._client.get_signing_key_from_jwt(token)
        kid = jwt.get_unverified_header(token).get("kid")
        for key in self._fixed.keys:
            if key.key_id == kid:
                return key
        raise jwt.InvalidTokenError("The token was signed with an unknown key.")

    def verify(self, token: str) -> User:
        claims: dict[str, Any] = jwt.decode(
            token,
            self._signing_key(token),
            algorithms=ALGORITHMS,
            audience="authenticated",
            issuer=self.issuer,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
        if claims.get("is_anonymous"):
            raise jwt.InvalidTokenError("Anonymous sessions can't use the app.")
        return User(id=claims["sub"], email=claims.get("email"))


def auth_required(message: str) -> ApiError:
    return ApiError(401, "AUTH_REQUIRED", message, headers={"WWW-Authenticate": "Bearer"})


bearer = HTTPBearer(auto_error=False, description="A Supabase access token for a signed-in user.")


def require_user(
    request: Request, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> User:
    if credentials is None or not credentials.credentials.strip():
        raise auth_required("Sign in to continue.")
    verifier: TokenVerifier = request.app.state.verifier
    try:
        return verifier.verify(credentials.credentials.strip())
    except PyJWKClientConnectionError as exc:
        logger.warning("Couldn't fetch Supabase's signing keys", exc_info=True)
        raise ApiError(
            503, "AUTH_UNAVAILABLE", "Sign-in can't be checked right now. Try again in a minute."
        ) from exc
    except jwt.ExpiredSignatureError as exc:
        raise auth_required("Your session has expired. Sign in again.") from exc
    except (jwt.InvalidTokenError, PyJWKClientError) as exc:
        raise auth_required("Sign in to continue.") from exc
