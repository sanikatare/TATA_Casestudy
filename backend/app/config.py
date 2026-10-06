import os
from pathlib import Path
from typing import List

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field
except ImportError:
    from pydantic import BaseModel as BaseSettings, Field  # type: ignore
    SettingsConfigDict = dict  # type: ignore


class Settings(BaseSettings):
    """Application configuration settings for AUTOSAR HLD Analysis Assistant."""
    
    # Environment & Diagnostics
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    APP_NAME: str = Field(default="AUTOSAR HLD Document Analysis Assistant")
    APP_VERSION: str = Field(default="1.0.0")

    # Network / Host
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=8000)
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:8501", "http://127.0.0.1:8501", "http://localhost:3000", "*"]
    )

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Field(default_factory=lambda: Path("./data"))
    SQLITE_DB_PATH: Path = Field(default_factory=lambda: Path("./data/sqlite/autosar_rag.db"))
    UPLOADS_DIR: Path = Field(default_factory=lambda: Path("./data/uploads"))
    CHROMA_PERSIST_DIR: Path = Field(default_factory=lambda: Path("./data/chroma"))

    # RAG Settings (Phase 4 preparation)
    EMBEDDING_MODEL: str = Field(default="BAAI/bge-small-en-v1.5")
    CHROMA_COLLECTION_NAME: str = Field(default="autosar_hld_chunks")
    TOP_K_RETRIEVAL: int = Field(default=5)

    # LLM Settings (Phase 5 preparation)
    LLM_PROVIDER: str = Field(default="local")
    LOCAL_LLM_URL: str = Field(default="http://localhost:11434")
    LLM_MODEL_NAME: str = Field(default="mistral")
    GEMINI_API_KEY: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def ensure_directories(self) -> None:
        """Ensure all required persistence directories exist."""
        for path in [self.UPLOADS_DIR, self.SQLITE_DB_PATH.parent, self.CHROMA_PERSIST_DIR]:
            path.mkdir(parents=True, exist_ok=True)


# Singleton settings instance
settings = Settings()
settings.ensure_directories()
