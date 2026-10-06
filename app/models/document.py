from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from pydantic import BaseModel, Field
except ImportError:
    # Graceful fallback for minimal Python runtime before pip install
    class BaseModel:
        def __init__(self, **kwargs):
            # Apply default values defined on class
            for k, v in self.__class__.__dict__.items():
                if not k.startswith("_") and not callable(v):
                    setattr(self, k, v)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def dict(self):
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

        def model_dump(self):
            return self.dict()

    def Field(default=None, **kwargs):
        if "default_factory" in kwargs:
            return kwargs["default_factory"]()
        return default


# ==============================================================================
# Ingestion Custom Exceptions
# ==============================================================================

class IngestionError(Exception):
    """Base exception for all document ingestion failures."""
    pass


class EmptyDocumentError(IngestionError):
    """Raised when a PDF contains no extractable digital text (e.g., scanned image)."""
    pass


class CorruptedPDFError(IngestionError):
    """Raised when the document file cannot be opened or is malformed."""
    pass


class UnsupportedFileTypeError(IngestionError):
    """Raised when an unaccepted file extension is provided."""
    pass


# ==============================================================================
# Normalized Internal Document Models
# ==============================================================================

class Page(BaseModel):
    """
    Represents an extracted physical page from an AUTOSAR HLD document.
    Page numbers are strictly 1-indexed to guarantee citation fidelity.
    """
    page_number: int = 1
    text: str = ""
    is_empty: bool = False
    section: Optional[str] = None
    metadata: Dict[str, Any] = {}

    def __init__(self, page_number: int = 1, text: str = "", is_empty: bool = False, section: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None, **kwargs):
        super().__init__(
            page_number=page_number,
            text=text,
            is_empty=is_empty,
            section=section,
            metadata=metadata or {},
            **kwargs
        )


class Document(BaseModel):
    """
    Normalized internal document structure.
    Document
    ├── document_id
    ├── filename
    ├── metadata
    └── pages[]
    """
    document_id: str = ""
    filename: str = ""
    file_path: str = ""
    file_size_bytes: int = 0
    page_count: int = 0
    empty_page_count: int = 0
    metadata: Dict[str, Any] = {}
    pages: List[Page] = []

    def __init__(self, document_id: str = "", filename: str = "", file_path: str = "", file_size_bytes: int = 0, page_count: int = 0, empty_page_count: int = 0, metadata: Optional[Dict[str, Any]] = None, pages: Optional[List[Page]] = None, **kwargs):
        super().__init__(
            document_id=document_id,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            page_count=page_count,
            empty_page_count=empty_page_count,
            metadata=metadata or {},
            pages=pages or [],
            **kwargs
        )


class Chunk(BaseModel):
    """
    Context-aware text chunk prepared for vector embedding.
    Chunk
    ├── chunk_id
    ├── document_id
    ├── page_number
    ├── section
    ├── text
    ├── source_filename
    └── metadata
    """
    chunk_id: str = ""
    document_id: str = ""
    page_number: int = 1
    section: str = "General"
    text: str = ""
    source_filename: str = ""
    chunk_index: int = 0
    metadata: Dict[str, Any] = {}

    def __init__(self, chunk_id: str = "", document_id: str = "", page_number: int = 1, section: str = "General", text: str = "", source_filename: str = "", chunk_index: int = 0, metadata: Optional[Dict[str, Any]] = None, **kwargs):
        super().__init__(
            chunk_id=chunk_id,
            document_id=document_id,
            page_number=page_number,
            section=section,
            text=text,
            source_filename=source_filename,
            chunk_index=chunk_index,
            metadata=metadata or {},
            **kwargs
        )


# ==============================================================================
# API Response & Storage Models
# ==============================================================================

class DocumentMetadata(BaseModel):
    """Flat representation for SQLite storage and list views."""
    id: str = ""
    filename: str = ""
    file_path: str = ""
    file_size_bytes: int = 0
    page_count: int = 1
    chunk_count: int = 0
    standard: str = "AUTOSAR Classic 4.4"
    ecu_domain: Optional[str] = "Zonal Gateway"
    processing_status: str = "INDEXED"
    uploaded_at: str = ""

    def __init__(self, **kwargs):
        if "uploaded_at" not in kwargs:
            kwargs["uploaded_at"] = datetime.utcnow().isoformat()
        super().__init__(**kwargs)


class DocumentResponse(DocumentMetadata):
    """API response model."""
    empty_pages: Optional[int] = 0


class ChunkMetadata(BaseModel):
    """Metadata schema attached to ChromaDB vector objects."""
    document_id: str = ""
    filename: str = ""
    page_number: int = 1
    section_title: Optional[str] = "General"
    chunk_id: str = ""
    chunk_index: int = 0
    ecu_domain: Optional[str] = None
