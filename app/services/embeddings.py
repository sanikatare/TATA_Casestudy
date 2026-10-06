from typing import List
import hashlib
import math

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

from app.config import settings
from app.utils.logging import logger

_model_instance = None


class EmbeddingService:
    """
    Dense text vectorization service.
    Uses SentenceTransformers (BGE/E5/MiniLM) when torch/transformers are installed,
    with a deterministic mathematical vectorizer fallback for resource-constrained viva demos.
    """

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self.dimension = 384
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
            logger.info("SentenceTransformer loaded successfully.")
        except Exception as e:
            logger.warning(f"SentenceTransformer not available ({e}). Using deterministic fallback embedding engine.")
            self.model = None
            self.is_real_model = False

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Encodes a batch of text strings into 384-dimensional normalized vectors."""
        if not texts:
            return []

        if self.is_real_model and self.model is not None:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()

        # Deterministic semantic hash projection fallback (384-d normalized)
        # Guarantees identical embeddings for identical text and consistent cosine distance
        vectors = []
        for text in texts:
            vec = [0.0] * self.dimension
            words = text.lower().split()
            for idx, word in enumerate(words):
                h = int(hashlib.md5(word.encode()).hexdigest(), 16)
                pos = h % self.dimension
                vec[pos] += 1.0 / (idx + 1)
            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0:
                vec = [v / norm for v in vec]
            vectors.append(vec)
        return vectors

    def embed_query(self, text: str) -> List[float]:
        """Encodes a single user query."""
        results = self.embed_texts([text])
        return results[0] if results else [0.0] * self.dimension


embedding_service = EmbeddingService()
