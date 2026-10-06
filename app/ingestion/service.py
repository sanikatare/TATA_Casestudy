import uuid
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List

from app.config import settings
from app.utils.logging import logger
from app.models.document import (
    Document,
    Chunk,
    DocumentMetadata,
    EmptyDocumentError,
    UnsupportedFileTypeError,
    CorruptedPDFError
)
from app.ingestion.pdf_parser import pdf_parser
from app.ingestion.chunker import document_chunker
from app.services.database import db
from app.services.vector_store import vector_store


class IngestionService:
    """
    High-Level Document Ingestion Service.
    Orchestrates file reception, parsing, validation, chunking, SQLite persistence,
    and ChromaDB vector indexing.
    """

    def __init__(self):
        self.parser = pdf_parser
        self.chunker = document_chunker

    def ingest_file(
        self,
        file_path: Path,
        filename: Optional[str] = None,
        ecu_domain: Optional[str] = "Central Zonal Gateway",
        standard: Optional[str] = "AUTOSAR Classic 4.4"
    ) -> Dict[str, Any]:
        """
        Ingests a document file from disk into the system.
        Performs extraction, validation, chunking, SQLite record creation, and vector indexing.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Specification file not found at: {file_path}")

        document_id = f"doc-{uuid.uuid4().hex[:8]}"
        resolved_name = filename or file_path.name

        logger.info(f"Beginning ingestion for '{resolved_name}' [ID: {document_id}]")

        # 1. Parse Document & Extract Pages
        # Raises EmptyDocumentError, CorruptedPDFError, or UnsupportedFileTypeError if invalid
        document: Document = self.parser.parse(
            file_path=file_path,
            document_id=document_id,
            filename=resolved_name,
            ecu_domain=ecu_domain,
            standard=standard
        )

        # 2. Context-Aware Semantic Chunking (Page-Preserving)
        chunks: List[Chunk] = self.chunker.chunk_document(document)

        if not chunks:
            raise EmptyDocumentError(
                f"Document '{resolved_name}' yielded 0 valid text chunks after filtering empty pages."
            )

        # 3. Vector Embeddings & ChromaDB Indexing
        chunk_ids = [c.chunk_id for c in chunks]
        chunk_texts = [c.text for c in chunks]
        chunk_metas = [c.metadata for c in chunks]

        vector_store.add_chunks(
            chunk_ids=chunk_ids,
            documents=chunk_texts,
            metadatas=chunk_metas
        )

        # 4. Save Relational Metadata into SQLite Store
        doc_metadata = DocumentMetadata(
            id=document.document_id,
            filename=document.filename,
            file_path=str(file_path),
            file_size_bytes=document.file_size_bytes,
            page_count=document.page_count,
            chunk_count=len(chunks),
            standard=standard,
            ecu_domain=ecu_domain,
            processing_status="INDEXED"
        )
        db.save_document(doc_metadata)

        logger.info(
            f"Successfully ingested '{resolved_name}': "
            f"{document.page_count} pages ({document.empty_page_count} empty), "
            f"{len(chunks)} chunks indexed into ChromaDB."
        )

        return {
            "document": document,
            "chunks": chunks,
            "chunk_count": len(chunks),
            "page_count": document.page_count,
            "empty_pages": document.empty_page_count,
            "status": "INDEXED"
        }


ingestion_service = IngestionService()
