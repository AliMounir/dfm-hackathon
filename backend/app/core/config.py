"""Application configuration, loaded from environment / .env."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[3] is the repo root.
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Doctors for Madagascar — M&E Data Assistant API"
    environment: str = "development"

    # Comma-separated allowed CORS origins (the Next.js frontend).
    cors_origins: str = "http://localhost:3000"

    # Where the M&E project data lives (REDCap/DHIS2/Excel exports, etc.).
    data_dir: Path = _REPO_ROOT / "data"

    # LLM provider for the assistant — Anthropic Claude by default.
    llm_provider: str = "anthropic"
    llm_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
