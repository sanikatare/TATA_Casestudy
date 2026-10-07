from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.vector_store import vector_store
from app.utils.logging import logger


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., description="Natural language search term or engineering keyword")
    document_id: Optional[str] = Field(None, description="Filter search to specific document ID")
    top_k: int = Field(5, ge=1, le=25, description="Number of top relevant chunks to retrieve")


class SemanticSearchResult(BaseModel):
    rank: int
    chunk_id: str
    document_name: str
    document_id: str
    page_number: int
    section: str
    similarity_score: float = Field(..., description="Normalized cosine similarity (0.0 to 1.0)")
    snippet: str
    char_count: int


class SemanticSearchResponse(BaseModel):
    query: str
    total_results: int
    top_k: int
    document_filter: Optional[str] = None
    results: List[SemanticSearchResult]


class SemanticSearchService:
    """
    Dedicated Semantic Vector Search Engine for AUTOSAR HLD documents.
    Performs dense embedding similarity search with metadata filtering and snippet extraction.
    """

    def search(self, request: SemanticSearchRequest) -> SemanticSearchResponse:
        results = vector_store.search(
            query=request.query,
            document_id=request.document_id,
            top_k=request.top_k
        )

        formatted_results: List[SemanticSearchResult] = []
        for idx, r in enumerate(results, start=1):
            if isinstance(r, dict):
                cid = r.get("id", f"chunk_{idx}")
                text = r.get("text", "")
                meta = r.get("metadata") or {}
                score = r.get("similarity", 0.0)
            else:
                cid = getattr(r, "chunk_id", getattr(r, "id", f"chunk_{idx}"))
                text = getattr(r, "text", "")
                meta = getattr(r, "metadata", {}) or {}
                score = getattr(r, "score", getattr(r, "similarity", 0.0))

            snippet_text = text.strip()
            preview = snippet_text[:350] + "..." if len(snippet_text) > 350 else snippet_text

            formatted_results.append(
                SemanticSearchResult(
                    rank=idx,
                    chunk_id=cid,
                    document_name=meta.get("filename", meta.get("document", "AUTOSAR_HLD.pdf")),
                    document_id=meta.get("document_id", request.document_id or "default"),
                    page_number=int(meta.get("page_number", meta.get("page", 1))),
                    section=meta.get("section", meta.get("heading", "General Architecture")),
                    similarity_score=round(float(score), 4),
                    snippet=preview,
                    char_count=len(snippet_text)
                )
            )

        return SemanticSearchResponse(
            query=request.query,
            total_results=len(formatted_results),
            top_k=request.top_k,
            document_filter=request.document_id,
            results=formatted_results
        )


search_service = SemanticSearchService()
