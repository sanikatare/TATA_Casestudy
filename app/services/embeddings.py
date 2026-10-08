from typing import List, Optional
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
        self.load_error: Optional[str] = None
        self.warning_message: Optional[str] = None
        self.active_engine_name: str = model_name
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
            self.warning_message = None
            self.active_engine_name = self.model_name
            logger.info("SentenceTransformer loaded successfully.")
        except Exception as e:
            self.load_error = str(e)
            self.warning_message = (
                f"WARNING: Dense embedding model '{self.model_name}' failed to load ({e}). "
                f"Using deterministic fallback embedding engine (384-d). Real BGE is NOT active."
            )
            logger.warning(self.warning_message)
            self.model = None
            self.is_real_model = False
            self.active_engine_name = "Deterministic-Fallback-Vectorizer (384-d)"

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Encodes a batch of text strings into 384-dimensional normalized vectors."""
        if not texts:
            return []

        if self.is_real_model and self.model is not None:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()

        # Deterministic semantic feature hashing projection (384-d L2 normalized)
        # Uses signed random projection (Hashing Trick: Weinberger et al.) with sublinear TF and bigrams.
        # Guarantees identical embeddings for identical text, unbiased cosine distance in bag-of-words/n-gram space.
        stopwords = {
            "a", "an", "the", "is", "are", "was", "were", "in", "on", "at", "of", "for", "with",
            "by", "about", "as", "into", "like", "through", "after", "over", "between", "out",
            "against", "during", "without", "before", "under", "around", "among", "which", "what",
            "who", "whom", "this", "that", "these", "those", "it", "its", "they", "them", "their",
            "we", "us", "our", "you", "your", "he", "him", "his", "she", "her", "and", "or", "but",
            "if", "because", "so", "to", "from", "up", "down", "how", "when", "where", "why", "all",
            "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
            "only", "own", "same", "than", "too", "very", "can", "will", "just", "should", "now"
        }

        vectors = []
        import re
        for text in texts:
            vec = [0.0] * self.dimension
            tokens = [w for w in re.findall(r"[a-zA-Z0-9_\-]+", text.lower()) if len(w) > 1]
            if not tokens:
                vectors.append(vec)
                continue

            # Unigram term frequencies with signed hashing
            tf_counts: dict[str, int] = {}
            for t in tokens:
                tf_counts[t] = tf_counts.get(t, 0) + 1

            for token, tf in tf_counts.items():
                base_w = 0.25 if token in stopwords else 1.0
                weight = base_w * (1.0 + math.log(tf))
                pos = int(hashlib.md5(token.encode()).hexdigest(), 16) % self.dimension
                sign = 1.0 if (int(hashlib.sha1(token.encode()).hexdigest(), 16) & 1) == 0 else -1.0
                vec[pos] += sign * weight

            # Bigram feature hashing for engineering phrases (e.g. "can-fd", "sender-receiver")
            for i in range(len(tokens) - 1):
                t1, t2 = tokens[i], tokens[i + 1]
                if t1 not in stopwords or t2 not in stopwords:
                    bigram = f"{t1}_{t2}"
                    pos_bi = int(hashlib.md5(bigram.encode()).hexdigest(), 16) % self.dimension
                    sign_bi = 1.0 if (int(hashlib.sha1(bigram.encode()).hexdigest(), 16) & 1) == 0 else -1.0
                    vec[pos_bi] += sign_bi * 0.85

            norm = math.sqrt(sum(v * v for v in vec))
            if norm > 0:
                vec = [round(v / norm, 6) for v in vec]
            vectors.append(vec)
        return vectors

    def embed_query(self, text: str) -> List[float]:
        """Encodes a single user query."""
        results = self.embed_texts([text])
        return results[0] if results else [0.0] * self.dimension


embedding_service = EmbeddingService()
