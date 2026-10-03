from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import sessionmaker
from starlette.responses import Response
from starlette.types import Scope

from app.api_errors import install_error_handlers
from app.auth import TokenVerifier, require_user
from app.config import Settings
from app.db import make_engine
from app.routes import auth, edits, health, imports, templates


class FrontendFiles(StaticFiles):
    """The exported frontend. Pages are checked again on every visit (a cheap 304 when nothing changed), so a
    deploy shows at once; without a header, browsers reuse an old page for hours. Build files under
    _next/static have a content hash in their name, so they're kept for a year."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        hashed = path.replace("\\", "/").startswith("_next/static/")
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable" if hashed else "no-cache"
        return response


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the app. Run with `uvicorn app.main:create_app --factory`."""
    settings = settings or Settings()
    if not (settings.supabase_url and settings.supabase_publishable_key):
        # Fail at start-up rather than serve an app nobody can sign in to.
        # On Render, a failed start leaves the previous deploy serving.
        raise RuntimeError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set (ADR-009).")
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        engine.dispose()

    app = FastAPI(title="Spectora template importer", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    app.state.verifier = TokenVerifier(settings.supabase_url, settings.supabase_jwks)
    install_error_handlers(app)
    # A template tree is ~230 KB of JSON; gzip brings it to a fraction of that over the Singapore link.
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Public: the uptime monitor's ping and what the browser needs to sign in. Everything else needs a token.
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    signed_in = [Depends(require_user)]
    app.include_router(imports.router, prefix="/api", dependencies=signed_in)
    app.include_router(templates.router, prefix="/api", dependencies=signed_in)
    app.include_router(edits.router, prefix="/api", dependencies=signed_in)

    # Mounted last so /api routes win. html=True serves template/index.html at /template/ and 404.html for
    # unknown paths, which is what `output: 'export'` with `trailingSlash: true` produces (ADR-008).
    if Path(settings.frontend_dir).is_dir():
        app.mount("/", FrontendFiles(directory=settings.frontend_dir, html=True), name="frontend")
    return app
