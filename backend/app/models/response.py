from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Application health status")
    version: Optional[str] = Field(default="1.0.0", description="Backend version")
    database: Optional[str] = Field(default="connected", description="SQLite connectivity status")


class CitationItem(BaseModel):
    """Exact citation pinpointing where evidence was extracted from the HLD PDF."""
    document: str = Field(..., description="Source document file name")
    document_id: Optional[str] = Field(None, description="Document UUID")
    page: int = Field(..., description="1-indexed PDF page number")
    section: Optional[str] = Field(default="Unknown Section", description="Section or architectural block title")
    chunk_id: Optional[str] = Field(None, description="Unique chunk UUID")
    snippet: Optional[str] = Field(None, description="Exact text excerpt")
    relevance: float = Field(default=0.0, description="Semantic similarity relevance score (0.0 - 1.0)")


class RetrievedChunk(BaseModel):
    """Retrieved chunk used in the context assembly."""
    chunk_id: str
    text: str
    page: int
    section: Optional[str] = None
    similarity_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class QueryResponse(BaseModel):
    """Grounded answer response returned by RAG pipeline."""
    answer: str = Field(..., description="Grounded architectural answer produced from retrieved context")
    citations: List[CitationItem] = Field(default_factory=list, description="Preserved page/section citations")
    retrieved_chunks: List[RetrievedChunk] = Field(default_factory=list, description="Raw chunks supplied to LLM")
    query_id: Optional[str] = None
    execution_time_sec: Optional[float] = None
