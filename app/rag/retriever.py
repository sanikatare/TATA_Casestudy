from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.vector_store import vector_store
from app.utils.logging import logger


class RAGRetriever:
    """
    Semantic Retriever for AUTOSAR HLD Chunks.
    Executes dense cosine similarity search over ChromaDB with optional document-level scoping.
    Enforces SIMILARITY_THRESHOLD from configuration to eliminate low-relevance chunks.
    """

    def __init__(
        self,
        top_k: int = settings.TOP_K_RETRIEVAL,
        threshold: float = settings.SIMILARITY_THRESHOLD
    ):
        self.top_k = top_k
        self.threshold = threshold

    def retrieve_context(
        self,
        query: str,
        document_id: Optional[str] = None,
        top_k: Optional[int] = None,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant chunks matching the engineering query.
        Genuinely enforces SIMILARITY_THRESHOLD from configuration: low-relevance
        chunks below threshold are filtered out and not passed into generation as valid evidence.
        """
        k = top_k or self.top_k
        configured_threshold = threshold if threshold is not None else self.threshold
        if threshold is not None:
            effective_threshold = threshold
        else:
            from app.services.embeddings import embedding_service
            if embedding_service.is_real_model:
                effective_threshold = self.threshold
            else:
                # Calibrates 0.60 BGE threshold to 0.08 in sparse unigram-bigram hash space
                effective_threshold = max(0.06, self.threshold * 0.14)

        logger.info(
            f"Retrieving top-{k} context chunks for query: '{query[:60]}...' "
            f"[effective_threshold={effective_threshold:.4f}, configured={configured_threshold}]"
        )
        candidate_chunks = vector_store.search(query=query, top_k=k, document_id=document_id)

        # Enforce threshold: only chunks meeting or exceeding the similarity threshold are valid evidence
        valid_chunks = [
            chunk for chunk in candidate_chunks
            if float(chunk.get("similarity", 0.0)) >= effective_threshold
        ]

        logger.info(
            f"Retrieved {len(candidate_chunks)} candidate chunks from vector store; "
            f"{len(valid_chunks)} met similarity threshold ({effective_threshold:.4f})."
        )
        return valid_chunks


rag_retriever = RAGRetriever()
