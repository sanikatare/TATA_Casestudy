from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.vector_store import vector_store
from app.utils.logging import logger


class RAGRetriever:
    """
    Semantic Retriever for AUTOSAR HLD Chunks.
    Executes dense cosine similarity search over ChromaDB with optional document-level scoping.
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
        top_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant chunks matching the engineering query.
        """
        k = top_k or self.top_k
        logger.info(f"Retrieving top-{k} context chunks for query: '{query[:60]}...'")
        results = vector_store.search(query=query, top_k=k, document_id=document_id)
        logger.info(f"Retrieved {len(results)} candidate chunks from vector store.")
        return results


rag_retriever = RAGRetriever()
