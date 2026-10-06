from typing import Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """User query request against an AUTOSAR document."""
    question: str = Field(..., min_length=2, description="Natural language question regarding the AUTOSAR HLD")
    document_id: Optional[str] = Field(None, description="Optional document ID to scope retrieval")
    top_k: Optional[int] = Field(default=5, ge=1, le=20, description="Number of relevant chunks to retrieve")
