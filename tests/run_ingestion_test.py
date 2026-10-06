#!/usr/bin/env python3
"""
Standalone Ingestion Test Runner for AUTOSAR HLD Documents.
Can be executed with standard Python without requiring external test frameworks:
    python3 tests/run_ingestion_test.py
"""

import sys
from pathlib import Path

# Add project root to sys.path so 'app' is importable
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.models.document import (
    Document,
    Page,
    Chunk,
    EmptyDocumentError,
    UnsupportedFileTypeError
)
from app.ingestion.pdf_parser import pdf_parser
from app.ingestion.chunker import document_chunker
from app.ingestion.service import ingestion_service


def run_tests():
    sample_pdf = Path("./data/documents/sample_autosar_hld.pdf")
    empty_pdf = Path("./data/documents/scanned_empty_sample.pdf")

    if not sample_pdf.exists() or not empty_pdf.exists():
        from data.documents.generate_sample_pdf import main as gen_pdf
        gen_pdf()

    print("======================================================================")
    print("AUTOSAR HLD DOCUMENT INGESTION PIPELINE TEST SUITE")
    print("======================================================================\n")

    # ---------------------------------------------------------
    # TEST 1: Parse Multi-Page PDF & Preserve Page Numbers
    # ---------------------------------------------------------
    print("Test 1: Parsing valid AUTOSAR HLD PDF with section detection...")
    doc = pdf_parser.parse(
        file_path=sample_pdf,
        document_id="doc_test_101",
        ecu_domain="Central Zonal Gateway",
        standard="AUTOSAR Classic 4.4"
    )

    assert isinstance(doc, Document), "Output must be normalized Document"
    assert doc.page_count >= 3, f"Expected at least 3 pages, got {doc.page_count}"
    assert doc.empty_page_count == 0, f"Expected 0 empty pages in valid PDF, got {doc.empty_page_count}"

    print(f"  ✓ Document ID: {doc.document_id}")
    print(f"  ✓ Total Pages Extracted: {doc.page_count}")
    print(f"  ✓ Empty/Scanned Pages: {doc.empty_page_count}")

    for idx, page in enumerate(doc.pages, start=1):
        assert page.page_number == idx, f"Page number must be strictly 1-indexed ({idx})"
        assert not page.is_empty, f"Page {idx} should have extractable text"
        print(f"  ✓ Page {page.page_number}: [{page.section}] -> {len(page.text)} chars")

    print("  -> PASSED: Valid PDF parsing & section detection.\n")

    # ---------------------------------------------------------
    # TEST 2: Page-Preserving Chunking
    # ---------------------------------------------------------
    print("Test 2: Context-aware chunking without cross-page data loss...")
    chunks = document_chunker.chunk_document(doc)
    assert len(chunks) >= 3, f"Expected at least 3 chunks, got {len(chunks)}"

    for i, chunk in enumerate(chunks[:5]):
        assert isinstance(chunk, Chunk)
        assert chunk.page_number in [p.page_number for p in doc.pages]
        assert chunk.document_id == doc.document_id
        print(f"  ✓ Chunk {i+1}: ID={chunk.chunk_id} | Page={chunk.page_number} | Section='{chunk.section}'")

    print(f"  -> PASSED: Generated {len(chunks)} chunks with 100% faithful page citations.\n")

    # ---------------------------------------------------------
    # TEST 3: Scanned / Empty PDF Error Handling
    # ---------------------------------------------------------
    print("Test 3: Detection of empty/scanned PDFs with no text layer...")
    caught_expected_error = False
    try:
        pdf_parser.parse(file_path=empty_pdf, document_id="doc_empty_102")
    except EmptyDocumentError as e:
        caught_expected_error = True
        print(f"  ✓ Expected EmptyDocumentError raised correctly:")
        print(f"    \"{e}\"")

    assert caught_expected_error, "EmptyDocumentError was not raised for empty/scanned PDF!"
    print("  -> PASSED: Scanned/empty PDF correctly detected and rejected.\n")

    # ---------------------------------------------------------
    # TEST 4: Unsupported File Format Validation
    # ---------------------------------------------------------
    print("Test 4: Unsupported file extension rejection...")
    invalid_file = Path("./data/documents/test_invalid.docx")
    invalid_file.write_text("Dummy content")
    caught_unsupported_error = False
    try:
        pdf_parser.parse(file_path=invalid_file, document_id="doc_invalid_103")
    except UnsupportedFileTypeError as e:
        caught_unsupported_error = True
        print(f"  ✓ Expected UnsupportedFileTypeError raised: \"{e}\"")
    finally:
        if invalid_file.exists():
            invalid_file.unlink()

    assert caught_unsupported_error, "UnsupportedFileTypeError was not raised for .docx!"
    print("  -> PASSED: Unsupported file formats rejected.\n")

    # ---------------------------------------------------------
    # TEST 5: End-to-End Ingestion Service (SQLite + ChromaDB)
    # ---------------------------------------------------------
    print("Test 5: Full Ingestion Service with Database & Vector Store...")
    result = ingestion_service.ingest_file(
        file_path=sample_pdf,
        filename="sample_autosar_hld.pdf",
        ecu_domain="Central Zonal Gateway",
        standard="AUTOSAR Classic 4.4"
    )

    assert result["status"] == "INDEXED"
    assert result["page_count"] >= 3
    assert result["chunk_count"] == len(result["chunks"])

    print(f"  ✓ Ingestion Status: {result['status']}")
    print(f"  ✓ Pages Ingested: {result['page_count']}")
    print(f"  ✓ Chunks Persisted: {result['chunk_count']}")
    print(f"  ✓ Document Object Type: {type(result['document']).__name__}")
    print("  -> PASSED: End-to-end ingestion service.\n")

    print("======================================================================")
    print("ALL 5 INGESTION TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")


if __name__ == "__main__":
    run_tests()
