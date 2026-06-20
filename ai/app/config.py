from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-4o-mini"

    horizon_ai_log_level: str = "info"
    horizon_ai_cors_origins: str = ""

    @property
    def llm_enabled(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def cors_origins(self) -> list[str]:
        if not self.horizon_ai_cors_origins.strip():
            return []
        return [o.strip() for o in self.horizon_ai_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
