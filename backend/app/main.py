from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import Settings
from app.db import make_engine
from app.routes import health


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the app. Run with `uvicorn app.main:create_app --factory`."""
    settings = settings or Settings()
    app = FastAPI(title="Spectora template importer")
    app.state.settings = settings
    app.state.engine = make_engine(settings.database_url)

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, prefix="/api")

    # Mounted last so /api routes win. html=True serves template/index.html at /template/ and 404.html for
    # unknown paths, which is what `output: 'export'` with `trailingSlash: true` produces (ADR-008).
    if Path(settings.frontend_dir).is_dir():
        app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
    return app
