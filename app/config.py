import os
from pathlib import Path

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    class BaseSettings:
        def __init__(self, **kwargs):
            for k, v in self.__class__.__dict__.items():
                if not k.startswith("_") and not callable(v):
                    env_val = os.environ.get(k)
                    if env_val is not None:
                        try:
                            if isinstance(v, bool):
                                env_val = env_val.lower() in ("true", "1", "yes")
                            elif isinstance(v, int):
                                env_val = int(env_val)
                            elif isinstance(v, float):
                                env_val = float(env_val)
                        except (ValueError, TypeError):
                            pass
                        setattr(self, k, env_val)
                    else:
                        setattr(self, k, v)
            for k, v in kwargs.items():
                setattr(self, k, v)
    def SettingsConfigDict(**kwargs):
        return {}


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables and .env file.
    Designed for B.Tech student clarity, zero hardcoded keys, and maintainability.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General App Info
    APP_NAME: str = "AUTOSAR HLD Document Analysis Assistant"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_PORT: int = 8501

    # LLM Settings
    LLM_PROVIDER: str = "gemini"  # 'gemini' or 'local_mock'
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Embedding & Vector DB Settings
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-small-en-v1.5"
    CHROMA_COLLECTION_NAME: str = "autosar_hld_chunks"
    TOP_K_RETRIEVAL: int = 5
    SIMILARITY_THRESHOLD: float = 0.60
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = Path("./data")
    UPLOADS_DIR: Path = Path("./data/documents")
    PROCESSED_DIR: Path = Path("./data/processed")
    VECTOR_STORE_DIR: Path = Path("./vector_store/chroma")
    SQLITE_DB_PATH: Path = Path("./data/autosar_assistant.db")
    SYSTEM_PROMPT_PATH: Path = Path("./prompts/system_prompt.txt")

    def ensure_directories(self) -> None:
        """Create necessary data, upload, and vector storage directories on boot."""
        for path in [
            self.DATA_DIR,
            self.UPLOADS_DIR,
            self.PROCESSED_DIR,
            self.VECTOR_STORE_DIR,
            self.SQLITE_DB_PATH.parent,
        ]:
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
