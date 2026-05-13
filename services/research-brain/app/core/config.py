from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="development", alias="RESEARCH_BRAIN_ENV")
    app_host: str = Field(default="0.0.0.0", alias="RESEARCH_BRAIN_HOST")
    app_port: int = Field(default=8010, alias="RESEARCH_BRAIN_PORT")
    app_title: str = Field(default="EduResearch Research Brain", alias="RESEARCH_BRAIN_TITLE")
    app_version: str = Field(default="0.1.0", alias="RESEARCH_BRAIN_VERSION")

    openalex_base_url: str = Field(default="https://api.openalex.org", alias="OPENALEX_BASE_URL")
    crossref_base_url: str = Field(default="https://api.crossref.org", alias="CROSSREF_BASE_URL")
    openalex_mailto: str = Field(default="research@kampus.ac.id", alias="OPENALEX_MAILTO")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    database_url: str = Field(default="", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    embedding_model: str = Field(default="bge-small-en-v1.5", alias="EMBEDDING_MODEL")
    vector_dimensions: int = Field(default=384, alias="VECTOR_DIMENSIONS")
    request_timeout_seconds: float = Field(default=20.0, alias="REQUEST_TIMEOUT_SECONDS")
    allowed_origins_raw: str = Field(default="http://localhost:3000,http://localhost:3001", alias="ALLOWED_ORIGINS")

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins_raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
