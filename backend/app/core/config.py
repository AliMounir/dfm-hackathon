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

    # LLM provider for the agent — OpenAI by default.
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 20
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    @property
    def llm_configured(self) -> bool:
        """True when the active provider has an API key set."""
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        return False

    # Supabase backend for uploaded source files and workflow state.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_upload_bucket: str = "dfm-data-uploads"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
