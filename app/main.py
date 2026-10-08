import uuid
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import settings
from app.utils.logging import logger
from app.models.document import (
    DocumentMetadata,
    DocumentResponse,
    EmptyDocumentError,
    UnsupportedFileTypeError,
    CorruptedPDFError
)
from app.models.query import QueryRequest, QueryResponse
from app.models.evaluation import BenchmarkSummary
from app.models.architecture import ArchitectureModel
from app.models.findings import ArchitectureFinding, ReviewUpdateRequest, ReviewSummary
from app.services.database import db
from app.services.vector_store import vector_store
from app.ingestion.service import ingestion_service
from app.rag.pipeline import rag_pipeline
from app.evaluation.benchmark import evaluator
from app.services.architecture import architecture_service
from app.services.search import search_service, SemanticSearchRequest, SemanticSearchResponse
from app.services.comparison import comparison_service, DocumentComparisonRequest, DocumentComparisonResponse
from app.services.consistency import consistency_engine
from app.services.review import review_service
from app.services.export import export_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("Initializing AUTOSAR HLD Document Analysis Assistant Backend...")
    settings.ensure_directories()
    db.init_db()

    # Pre-index synthetic sample specification if database is fresh
    existing = db.list_documents()
    if not existing:
        sample_doc_path = settings.UPLOADS_DIR / "ECU_Central_Gateway_HLD_v2.4.md"
        if not sample_doc_path.exists():
            src_sample = Path("./data/documents/ECU_Central_Gateway_HLD_v2.4.md")
            if src_sample.exists():
                shutil.copy(src_sample, sample_doc_path)

        if sample_doc_path.exists():
            try:
                ingestion_service.ingest_file(
                    file_path=sample_doc_path,
                    filename="ECU_Central_Gateway_HLD_v2.4.pdf",
                    ecu_domain="Central Zonal Gateway",
                    standard="AUTOSAR Classic 4.4"
                )
                logger.info("Pre-indexed baseline AUTOSAR Central Gateway specification.")
            except Exception as e:
                logger.warning(f"Could not pre-index baseline document: {e}")

    yield
    logger.info("Shutting down AUTOSAR HLD Assistant Backend.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend REST API for AUTOSAR High-Level Design document analysis, semantic RAG, and verified citations.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(EmptyDocumentError)
async def empty_document_handler(request: Request, exc: EmptyDocumentError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "EmptyDocumentError", "message": str(exc)}
    )


@app.exception_handler(UnsupportedFileTypeError)
async def unsupported_type_handler(request: Request, exc: UnsupportedFileTypeError):
    return JSONResponse(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        content={"error": "UnsupportedFileTypeError", "message": str(exc)}
    )


@app.exception_handler(CorruptedPDFError)
async def corrupted_pdf_handler(request: Request, exc: CorruptedPDFError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "CorruptedPDFError", "message": str(exc)}
    )


@app.get("/")
def get_root():
    """Root entrypoint providing service health and documentation links."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/health",
        "academic_notice": "AI-assisted engineering study prototype. Not an official Tata Technologies release."
    }


@app.get("/health")
def get_health():
    """System health check and diagnostic connectivity."""
    from app.services.embeddings import embedding_service
    from app.services.llm_client import llm_client
    
    bge_ok = embedding_service.is_real_model
    gemini_ok = llm_client.is_real_llm
    chroma_ok = (vector_store.client is not None)
    
    degraded_reasons = []
    if not bge_ok:
        degraded_reasons.append(f"BGE model '{settings.EMBEDDING_MODEL_NAME}' unavailable: using deterministic fallback engine")
    if not chroma_ok:
        degraded_reasons.append("ChromaDB unavailable: using in-memory vector store")
    if not gemini_ok:
        degraded_reasons.append("Gemini LLM unavailable: using local grounded synthesizer fallback")
    
    is_healthy = bge_ok and gemini_ok and chroma_ok
    model_display = (
        settings.EMBEDDING_MODEL_NAME
        if bge_ok
        else f"{settings.EMBEDDING_MODEL_NAME} [UNAVAILABLE: Fallback active]"
    )
    llm_display = (
        f"Google Gemini ({llm_client.model_name})"
        if gemini_ok
        else "Local Grounded Synthesizer [Degraded: Gemini Unavailable]"
    )
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "database": "SQLite Connected",
        "vector_store": "ChromaDB Ready" if chroma_ok else "In-Memory Vector Fallback",
        "embedding_model": model_display,
        "embedding_is_real_bge": bge_ok,
        "embedding_engine": embedding_service.active_engine_name,
        "embedding_warning": embedding_service.warning_message,
        "llm_provider": llm_display,
        "llm_is_real_gemini": gemini_ok,
        "degraded_reasons": degraded_reasons
    }


# ------------------ Document Ingestion Endpoints ------------------ #
@app.get("/documents", response_model=List[DocumentResponse])
def list_documents():
    """List all ingested AUTOSAR HLD specifications."""
    return db.list_documents()


@app.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    ecu_domain: Optional[str] = Form("Central Zonal Gateway"),
    standard: Optional[str] = Form("AUTOSAR Classic 4.4")
):
    """
    Ingest, parse, chunk, embed, and index an AUTOSAR HLD PDF document.
    Validates that the PDF contains extractable text and detects empty/scanned pages.
    """
    temp_id = uuid.uuid4().hex[:8]
    save_path = settings.UPLOADS_DIR / f"{temp_id}_{file.filename}"

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = ingestion_service.ingest_file(
            file_path=save_path,
            filename=file.filename,
            ecu_domain=ecu_domain,
            standard=standard
        )
        doc = result["document"]
        return DocumentResponse(
            id=doc.document_id,
            filename=doc.filename,
            file_path=doc.file_path,
            file_size_bytes=doc.file_size_bytes,
            page_count=doc.page_count,
            chunk_count=result["chunk_count"],
            empty_pages=doc.empty_page_count,
            standard=standard,
            ecu_domain=ecu_domain,
            processing_status="INDEXED"
        )
    except (EmptyDocumentError, UnsupportedFileTypeError, CorruptedPDFError):
        # Clean up failed upload file
        if save_path.exists():
            save_path.unlink()
        raise


@app.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str):
    """Retrieve metadata of a single document."""
    doc = db.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    """Remove a document from SQLite and delete its ChromaDB vector index."""
    doc = db.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    vector_store.delete_by_document(document_id)
    db.delete_document(document_id)

    file_path = Path(doc["file_path"])
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            logger.warning(f"Could not delete physical file: {e}")

    return {"deleted": True, "document_id": document_id}


# ------------------ RAG Chat Endpoints ------------------ #
@app.post("/chat/query", response_model=QueryResponse)
def query_assistant(request: QueryRequest):
    """
    Execute grounded RAG query against indexed AUTOSAR specifications.
    Returns synthesized answer and verifiable page-level citations.
    """
    return rag_pipeline.execute_query(request)


@app.get("/chat/history")
def get_history(limit: int = 50):
    """Retrieve historical queries and verifiable citation audit trails."""
    return db.get_query_history(limit=limit)


# ------------------ Architecture Analysis Endpoints ------------------ #
@app.get("/analysis/candidates")
def get_architecture_candidates(document_id: Optional[str] = None):
    """
    Extracts candidate Software Components (SW-Cs), Ports, and Interfaces
    recognized from the specification.
    """
    return {
        "components": [
            {"name": "PowertrainCoordination_SWC", "type": "Application SW-C", "asil": "ASIL-D", "ecu": "Powertrain DC", "periodicity": "10ms"},
            {"name": "Gateway_Router_SWC", "type": "Service Component", "asil": "ASIL-B", "ecu": "Central Gateway", "periodicity": "5ms"},
            {"name": "BodyControl_SWC", "type": "Sensor-Actuator SW-C", "asil": "QM", "ecu": "Body Zonal Controller", "periodicity": "20ms"},
            {"name": "Dem_BSW_Module", "type": "Diagnostic BSW Module", "asil": "ASIL-B", "ecu": "Central Gateway", "periodicity": "Event-driven"},
            {"name": "CanIf_Driver", "type": "Communication Hardware Driver", "asil": "ASIL-B", "ecu": "Central Gateway", "periodicity": "1ms"}
        ],
        "interfaces": [
            {"name": "SR_TorqueRequest", "kind": "Sender-Receiver", "provider": "PowertrainCoordination_SWC", "consumers": ["Gateway_Router_SWC"], "elements": "TorqueDemand_Nm (uint16)"},
            {"name": "SR_VehicleSpeed", "kind": "Sender-Receiver", "provider": "BodyControl_SWC", "consumers": ["PowertrainCoordination_SWC", "Gateway_Router_SWC"], "elements": "WheelSpeed_kph (float32)"},
            {"name": "CS_DiagRoutine_Service", "kind": "Client-Server", "provider": "Dem_BSW_Module", "consumers": ["Gateway_Router_SWC"], "elements": "StartRoutine(), StopRoutine()"}
        ],
        "bus_matrix": [
            {"channel": "CAN-FD 0", "bitrate_nominal": "500 kbps", "bitrate_data": "2.0 Mbps", "payload": "64 bytes", "ecu": "Central Gateway"}
        ]
    }


@app.get("/analysis/architecture", response_model=ArchitectureModel)
def get_architecture_model(document_id: Optional[str] = None):
    """
    Extracts complete AUTOSAR architecture model with page, section, and snippet
    evidence for SW-Cs, Ports, Interfaces, Signals, Dependencies, Flows, and Bus Matrix.
    """
    return architecture_service.analyze_document(document_id)


# ------------------ Semantic Search Endpoints ------------------ #
@app.post("/search/semantic", response_model=SemanticSearchResponse)
def semantic_search(request: SemanticSearchRequest):
    """
    Dedicated semantic search endpoint returning top-k relevant chunks,
    similarity scores, document names, page numbers, sections, and source snippets.
    """
    return search_service.search(request)


@app.get("/search/semantic", response_model=SemanticSearchResponse)
def semantic_search_get(q: str, document_id: Optional[str] = None, top_k: int = 5):
    """GET convenience method for semantic search."""
    req = SemanticSearchRequest(query=q, document_id=document_id, top_k=top_k)
    return search_service.search(req)


# ------------------ Document Comparison Endpoints ------------------ #
@app.post("/documents/compare", response_model=DocumentComparisonResponse)
def compare_documents(request: DocumentComparisonRequest):
    """
    Compares two HLD specifications and reports added, removed, and modified
    sections, SW-Cs, RTE interfaces, and bus matrices.
    """
    return comparison_service.compare_documents(request.document_id_a, request.document_id_b)


# ------------------ Consistency & Completeness Endpoints ------------------ #
@app.get("/analysis/consistency", response_model=List[ArchitectureFinding])
def get_consistency_findings(document_id: Optional[str] = None):
    """
    Executes consistency & completeness checks. Returns findings with severity,
    rule IDs, source evidence, and engineering suggestions.
    """
    return consistency_engine.run_checks(document_id)


# ------------------ Human Review Endpoints ------------------ #
@app.get("/reviews", response_model=List[ArchitectureFinding])
def list_reviews(document_id: Optional[str] = None):
    """Lists architecture findings with their persistent human review status."""
    return review_service.get_findings_with_reviews(document_id)


@app.post("/reviews/{finding_id}", response_model=Optional[ArchitectureFinding])
def update_review(finding_id: str, request: ReviewUpdateRequest):
    """
    Records an engineer review decision (ACCEPTED, REJECTED, EDITED)
    with comments and persists into SQLite.
    """
    updated = review_service.submit_review(finding_id, request)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")
    return updated


@app.get("/reviews/summary", response_model=ReviewSummary)
def get_review_summary(document_id: Optional[str] = None):
    """Returns aggregated counts of findings and review decisions."""
    return review_service.get_review_summary(document_id)


# ------------------ Export Endpoints ------------------ #
@app.get("/export/architecture")
def export_architecture(document_id: Optional[str] = None, format: str = "json"):
    """Exports architecture entities as JSON or CSV."""
    if format.lower() == "csv":
        csv_data = export_service.export_architecture_csv(document_id)
        return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=autosar_architecture.csv"})
    json_data = export_service.export_architecture_json(document_id)
    return Response(content=json_data, media_type="application/json", headers={"Content-Disposition": "attachment; filename=autosar_architecture.json"})


@app.get("/export/findings")
def export_findings(document_id: Optional[str] = None, format: str = "json"):
    """Exports consistency findings and review audit trails as JSON or CSV."""
    if format.lower() == "csv":
        csv_data = export_service.export_findings_csv(document_id)
        return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=autosar_findings_review.csv"})
    json_data = export_service.export_findings_json(document_id)
    return Response(content=json_data, media_type="application/json", headers={"Content-Disposition": "attachment; filename=autosar_findings_review.json"})


# ------------------ Benchmark & Evaluation Endpoints ------------------ #
@app.post("/evaluate/run", response_model=BenchmarkSummary)
def run_evaluation():
    """
    Runs fixed 10-question evaluation benchmark against ground truth criteria.
    Measures Citation Recall, Keyword Accuracy, and Negative Constraint adherence.
    """
    return evaluator.run_benchmark()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=settings.DEBUG)
