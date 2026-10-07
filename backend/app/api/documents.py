import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.app.config import settings
from backend.app.database.repositories import DocumentRepository
from backend.app.models.document import (
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentMetadata,
    DocumentUploadResponse,
    ExtractedPageSchema,
)
from backend.app.utils.logging import logger
from backend.app.utils.pdf_parser import parse_pdf

router = APIRouter(prefix="/documents", tags=["Documents"])


def get_parsed_cache_path(doc_id: str) -> Path:
    """Returns path to cached parsed JSON representation."""
    return settings.PARSED_DIR / f"{doc_id}.json"


@router.get("", response_model=List[DocumentMetadata])
def list_documents():
    """List all ingested AUTOSAR HLD documents."""
    docs = DocumentRepository.list_all()
    return docs


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Ingest, validate, and parse an AUTOSAR High-Level Design (HLD) PDF specification.
    
    Validations:
    - Verifies file format is PDF (MIME application/pdf or .pdf extension).
    - Verifies file is non-empty.
    - Enforces maximum upload size limit.
    - Validates PDF structure and page integrity using PyMuPDF.
    
    Persistence:
    - Saves PDF into storage.
    - Records metadata in SQLite with status progression (PENDING -> INDEXED / FAILED).
    - Caches structured extracted pages with section headings and tables for downstream RAG.
    """
    filename = file.filename or "unknown.pdf"
    clean_filename = re.sub(r"[^\w\.\-\_]", "_", filename)
    
    # 1. Validate file extension and MIME type
    is_pdf_ext = clean_filename.lower().endswith(".pdf")
    is_pdf_mime = file.content_type in ["application/pdf", "application/x-pdf", "application/octet-stream"]
    
    if not is_pdf_ext:
        logger.warning(f"Rejected non-PDF upload attempt: filename='{filename}', mime='{file.content_type}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{filename}'. Only PDF documents (.pdf) are supported.",
        )

    # 2. Read file contents and validate size
    try:
        contents = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file payload.",
        )

    file_size = len(contents)
    if file_size == 0:
        logger.warning(f"Rejected empty upload for '{filename}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{filename}' is empty (0 bytes). Please upload a valid AUTOSAR HLD PDF.",
        )

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        logger.warning(f"File '{filename}' ({file_size} bytes) exceeds limit of {max_mb} MB")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {max_mb:.0f} MB.",
        )

    # 3. Create document record with PENDING status
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_id}_{clean_filename}"
    target_path = settings.UPLOADS_DIR / stored_filename

    # Save physical file to disk
    try:
        settings.ensure_directories()
        with open(target_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to write file '{stored_filename}' to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded document to storage.",
        )

    DocumentRepository.create(
        id=doc_id,
        filename=filename,
        file_path=str(target_path),
        file_size_bytes=file_size,
        page_count=0,
        chunk_count=0,
        processing_status="PENDING",
    )

    # 4. Extract text, page boundaries, sections, and tables using PyMuPDF
    try:
        extracted = parse_pdf(target_path)

        # Cache structured parsed output
        cache_path = get_parsed_cache_path(doc_id)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(extracted.to_dict(), f, indent=2)

        # Update SQLite status to INDEXED
        DocumentRepository.update_status(
            doc_id=doc_id,
            status="INDEXED",
            page_count=extracted.total_pages,
            chunk_count=len(extracted.pages),
            file_size_bytes=file_size,
        )

        logger.info(
            f"Successfully processed document '{filename}' (ID: {doc_id}): "
            f"{extracted.total_pages} pages, {len(extracted.detected_sections)} sections."
        )

        return DocumentUploadResponse(
            document_id=doc_id,
            filename=filename,
            status="INDEXED",
            page_count=extracted.total_pages,
            total_characters=extracted.total_characters,
            sections_detected=extracted.detected_sections,
            message=f"Successfully extracted {extracted.total_pages} pages and {len(extracted.detected_sections)} architectural sections.",
        )

    except Exception as parse_err:
        logger.error(f"PDF extraction failed for '{filename}' (ID: {doc_id}): {parse_err}", exc_info=True)
        DocumentRepository.update_status(
            doc_id=doc_id,
            status="FAILED",
            file_size_bytes=file_size,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text from PDF: {str(parse_err)}",
        )


@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document_details(doc_id: str):
    """Retrieve detailed metadata, detected sections, and parsed page summaries for a document."""
    doc = DocumentRepository.get_by_id(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    cache_path = get_parsed_cache_path(doc_id)
    sections: List[str] = []
    page_schemas: List[ExtractedPageSchema] = []
    meta: Dict[str, Any] = {}

    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            sections = cached_data.get("detected_sections", [])
            meta = cached_data.get("metadata", {})
            for p in cached_data.get("pages", []):
                preview = p.get("text", "")[:200].strip().replace("\n", " ")
                if len(p.get("text", "")) > 200:
                    preview += "..."
                page_schemas.append(ExtractedPageSchema(
                    page_number=p.get("page_number", 1),
                    text_preview=preview,
                    char_count=p.get("char_count", 0),
                    char_start=p.get("char_start", 0),
                    char_end=p.get("char_end", 0),
                    sections=p.get("sections", []),
                    tables_count=len(p.get("tables", [])),
                ))
        except Exception as e:
            logger.warning(f"Could not load parsed cache for document '{doc_id}': {e}")

    return DocumentDetailResponse(
        document=DocumentMetadata(**doc),
        sections=sections,
        pages=page_schemas,
        metadata=meta,
    )


@router.get("/{doc_id}/pages")
def get_document_pages(doc_id: str):
    """Retrieve all parsed pages with full text, section headers, and extracted tables."""
    doc = DocumentRepository.get_by_id(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    cache_path = get_parsed_cache_path(doc_id)
    if not cache_path.exists():
        # Fallback: re-parse if file still exists on disk
        target_path = Path(doc["file_path"])
        if target_path.exists():
            extracted = parse_pdf(target_path)
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(extracted.to_dict(), f, indent=2)
            return extracted.to_dict()
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extracted pages not found for this document.",
            )

    with open(cache_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.delete("/{doc_id}", response_model=DocumentDeleteResponse)
def delete_document(doc_id: str):
    """Delete an ingested document and its associated storage assets."""
    doc = DocumentRepository.get_by_id(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    # 1. Remove physical files if present
    file_path = Path(doc.get("file_path", ""))
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete physical file {file_path}: {e}")

    cache_path = get_parsed_cache_path(doc_id)
    if cache_path.exists():
        try:
            cache_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete cache file {cache_path}: {e}")

    # 2. Remove SQLite record (cascades to queries and citations)
    DocumentRepository.delete(doc_id)
    logger.info(f"Deleted document '{doc.get('filename')}' (ID: {doc_id})")

    return DocumentDeleteResponse(
        document_id=doc_id,
        success=True,
        message=f"Document '{doc.get('filename')}' was successfully removed.",
    )


@router.post("/sample", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
def generate_and_ingest_sample_document():
    """Generates and ingests a standard multi-page AUTOSAR HLD specification for demonstration and testing."""
    from backend.app.utils.sample_generator import generate_sample_autosar_hld_pdf
    
    doc_id = str(uuid.uuid4())
    filename = "AUTOSAR_HLD_Powertrain_Gateway_v4.4.0.pdf"
    target_path = settings.UPLOADS_DIR / f"{doc_id}_{filename}"
    
    settings.ensure_directories()
    generate_sample_autosar_hld_pdf(target_path)
    file_size = target_path.stat().st_size

    DocumentRepository.create(
        id=doc_id,
        filename=filename,
        file_path=str(target_path),
        file_size_bytes=file_size,
        page_count=0,
        chunk_count=0,
        processing_status="PENDING",
    )

    extracted = parse_pdf(target_path)
    cache_path = get_parsed_cache_path(doc_id)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(extracted.to_dict(), f, indent=2)

    DocumentRepository.update_status(
        doc_id=doc_id,
        status="INDEXED",
        page_count=extracted.total_pages,
        chunk_count=len(extracted.pages),
        file_size_bytes=file_size,
    )

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=filename,
        status="INDEXED",
        page_count=extracted.total_pages,
        total_characters=extracted.total_characters,
        sections_detected=extracted.detected_sections,
        message=f"Successfully generated and ingested sample AUTOSAR HLD specification ({extracted.total_pages} pages).",
    )
