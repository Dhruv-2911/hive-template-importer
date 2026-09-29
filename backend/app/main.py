from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import sessionmaker

from app.api_errors import install_error_handlers
from app.config import Settings
from app.db import make_engine
from app.routes import health, imports


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the app. Run with `uvicorn app.main:create_app --factory`."""
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        engine.dispose()

    app = FastAPI(title="Spectora template importer", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    install_error_handlers(app)

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, prefix="/api")
    app.include_router(imports.router, prefix="/api")

    # Mounted last so /api routes win. html=True serves template/index.html at /template/ and 404.html for
    # unknown paths, which is what `output: 'export'` with `trailingSlash: true` produces (ADR-008).
    if Path(settings.frontend_dir).is_dir():
        app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
    return app
