from datetime import datetime
from typing import Optional
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
    message: str
