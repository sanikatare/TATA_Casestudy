from typing import List

from app.config import settings
from app.utils.logging import logger

_model_instance = None


class EmbeddingModelUnavailableError(RuntimeError):
    """Raised when the configured embedding model cannot be loaded."""


class EmbeddingService:
    """
    Dense embedding service backed by SentenceTransformers.
    Requires the configured BGE model to be available for ingestion and retrieval.
    """

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.dimension = 384
        self.model = None
        self.is_real_model = False
        self.load_error: str | None = None
        self._load_model()

    def _load_model(self) -> None:
        global _model_instance
        try:
            from sentence_transformers import SentenceTransformer

            if _model_instance is None:
                logger.info(f"Loading dense embedding model: {self.model_name}")
                _model_instance = SentenceTransformer(self.model_name)
            self.model = _model_instance
            self.is_real_model = True
            self.load_error = None
            logger.info("SentenceTransformer loaded successfully.")
        except Exception as e:
            self.model = None
            self.is_real_model = False
            self.load_error = str(e)
            logger.error(
                f"Failed to load embedding model '{self.model_name}'. "
                "RAG ingestion and retrieval are unavailable until this is resolved."
            )

    def ensure_available(self) -> None:
        if self.is_real_model and self.model is not None:
            return
        raise EmbeddingModelUnavailableError(
            f"Embedding model '{self.model_name}' is not available. "
            f"Details: {self.load_error or 'unknown load error'}"
        )

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Encodes a batch of text strings into 384-dimensional normalized vectors."""
        if not texts:
            return []
        self.ensure_available()
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        """Encodes a single user query."""
        if not text:
            return [0.0] * self.dimension
        return self.embed_texts([text])[0]


embedding_service = EmbeddingService()

