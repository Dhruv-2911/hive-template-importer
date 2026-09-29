from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    database_url: str
    max_upload_mb: int = 10
    # Comma-separated. Only needed in development, when Next.js runs on its own port.
    cors_origins: str = ""
    # The Next.js static export (ADR-008). Relative to backend/ in development; set by the Docker image.
    frontend_dir: str = "../frontend/out"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
