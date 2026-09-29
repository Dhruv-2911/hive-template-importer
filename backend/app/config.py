from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    database_url: str
    max_upload_mb: float = 10
    # Comma-separated. Only needed in development, when Next.js runs on its own port.
    cors_origins: str = ""
    # The Next.js static export (ADR-008). Relative to backend/ in development; set by the Docker image.
    frontend_dir: str = "../frontend/out"
    # The committed export the live app opens on (SPEC.md US7). Relative to backend/ in development.
    sample_export: str = "../InterNACHI Commercial Template-2026-09-28.xls"

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1_000_000)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
