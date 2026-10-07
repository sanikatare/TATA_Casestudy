from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    """Schema representing an ingested AUTOSAR HLD document."""
    id: str = Field(..., description="Unique UUID identifier for the document")
    filename: str = Field(..., description="Original PDF file name")
    file_path: str = Field(..., description="Server storage path")
    file_size_bytes: int = Field(default=0, description="Size of file in bytes")
    page_count: int = Field(default=0, description="Total number of extracted pages")
    chunk_count: int = Field(default=0, description="Total number of generated semantic chunks")
    processing_status: str = Field(default="PENDING", description="Processing state: PENDING, INDEXED, FAILED")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    """API response returned immediately after PDF upload."""
    document_id: str
    filename: str
    status: str
    page_count: int = 0
    total_characters: int = 0
    sections_detected: List[str] = Field(default_factory=list)
    message: str


class ExtractedPageSchema(BaseModel):
    """Structured representation of a parsed page."""
    page_number: int
    text_preview: str
    char_count: int
    char_start: int
    char_end: int
    sections: List[str] = Field(default_factory=list)
    tables_count: int = 0


class DocumentDetailResponse(BaseModel):
    """Extended document details including page metadata and detected sections."""
    document: DocumentMetadata
    sections: List[str] = Field(default_factory=list)
    pages: List[ExtractedPageSchema] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentDeleteResponse(BaseModel):
    """Response returned upon deleting a document."""
    document_id: str
    success: bool
    message: str
