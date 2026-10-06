from typing import List, Optional
try:
    from pydantic import BaseModel, Field
except ImportError:
    from app.models.document import BaseModel, Field


class Citation(BaseModel):
    """Verifiable source citation attached to an architectural answer."""
    document: str = ""
    page: int = 1
    section: Optional[str] = None
    chunk_id: str = ""
    snippet: str = ""
    relevance: float = 0.95


class QueryRequest(BaseModel):
    """User inquiry sent to the RAG Assistant."""
    question: str = ""
    document_id: Optional[str] = None
    top_k: Optional[int] = 5


class QueryResponse(BaseModel):
    """Grounded RAG synthesis response."""
    id: str = ""
    question: str = ""
    answer: str = ""
    document_id: Optional[str] = None
    document_name: str = ""
    timestamp: str = ""
    status: str = "SUCCESS"
    confidence_score: float = 0.95
    citations: List[Citation] = []
