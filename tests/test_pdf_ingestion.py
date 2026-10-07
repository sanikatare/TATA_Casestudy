import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database.database import init_db
from backend.app.utils.pdf_parser import parse_pdf
from backend.app.utils.sample_generator import generate_sample_autosar_hld_pdf


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure database schema is initialized before every test."""
    init_db()


def test_pdf_parser_direct(tmp_path: Path):
    """Verifies that PyMuPDF parser extracts pages, character offsets, tables, and section headers."""
    sample_pdf_path = tmp_path / "test_autosar_hld.pdf"
    generate_sample_autosar_hld_pdf(sample_pdf_path)

    assert sample_pdf_path.exists()
    assert sample_pdf_path.stat().st_size > 0

    extracted = parse_pdf(sample_pdf_path)

    assert extracted.total_pages == 4
    assert extracted.total_characters > 1000
    assert len(extracted.pages) == 4
    assert len(extracted.detected_sections) >= 3

    # Verify Page 1
    p1 = extracted.pages[0]
    assert p1.page_number == 1
    assert "Powertrain" in p1.text
    assert p1.char_start == 0
    assert p1.char_end == p1.char_count

    # Verify Page 2 (SW-C hierarchy)
    p2 = extracted.pages[1]
    assert p2.page_number == 2
    assert "EngineControl_SWC" in p2.text
    assert "TransmissionManager_SWC" in p2.text
    assert p2.char_start == p1.char_end

    # Verify Page 3 (Table of Port Interfaces)
    p3 = extracted.pages[2]
    assert p3.page_number == 3
    assert "EngineTorque_PPort" in p3.text
    assert "VehicleSpeed_RPort" in p3.text

    # Verify Page 4 (BSW and RTE)
    p4 = extracted.pages[3]
    assert p4.page_number == 4
    assert "Runtime Environment" in p4.text or "RTE" in p4.text
    assert "CanIf" in p4.text or "Dem" in p4.text


def test_upload_valid_pdf(tmp_path: Path):
    """Verifies that POST /documents/upload successfully ingests and parses a valid PDF."""
    sample_pdf_path = tmp_path / "valid_autosar.pdf"
    generate_sample_autosar_hld_pdf(sample_pdf_path)

    with open(sample_pdf_path, "rb") as f:
        pdf_bytes = f.read()

    with TestClient(app) as client:
        response = client.post(
            "/documents/upload",
            files={"file": ("valid_autosar.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 201
        data = response.json()

        doc_id = data["document_id"]
        assert doc_id
        assert data["filename"] == "valid_autosar.pdf"
        assert data["status"] == "INDEXED"
        assert data["page_count"] == 4
        assert len(data["sections_detected"]) >= 3

        # Verify document is listed in GET /documents
        list_resp = client.get("/documents")
        assert list_resp.status_code == 200
        doc_ids = [d["id"] for d in list_resp.json()]
        assert doc_id in doc_ids

        # Verify GET /documents/{doc_id}
        detail_resp = client.get(f"/documents/{doc_id}")
        assert detail_resp.status_code == 200
        detail_data = detail_resp.json()
        assert detail_data["document"]["id"] == doc_id
        assert len(detail_data["pages"]) == 4

        # Clean up
        del_resp = client.delete(f"/documents/{doc_id}")
        assert del_resp.status_code == 200


def test_upload_non_pdf_rejected():
    """Verifies that non-PDF files are rejected with HTTP 400 Bad Request."""
    fake_txt_content = b"This is not a PDF file content."
    with TestClient(app) as client:
        response = client.post(
            "/documents/upload",
            files={"file": ("architecture.txt", io.BytesIO(fake_txt_content), "text/plain")},
        )
        assert response.status_code == 400
        assert "Only PDF documents (.pdf) are supported" in response.json()["detail"]


def test_upload_empty_file_rejected():
    """Verifies that 0-byte PDF files are rejected with HTTP 400 Bad Request."""
    empty_content = b""
    with TestClient(app) as client:
        response = client.post(
            "/documents/upload",
            files={"file": ("empty.pdf", io.BytesIO(empty_content), "application/pdf")},
        )
        assert response.status_code == 400
        assert "is empty" in response.json()["detail"]


def test_generate_sample_endpoint():
    """Verifies that POST /documents/sample creates and ingests the sample HLD specification."""
    with TestClient(app) as client:
        response = client.post("/documents/sample")
        assert response.status_code == 201
        data = response.json()

        assert data["status"] == "INDEXED"
        assert data["page_count"] == 4
        doc_id = data["document_id"]

        # Check pages endpoint
        pages_resp = client.get(f"/documents/{doc_id}/pages")
        assert pages_resp.status_code == 200
        pages_data = pages_resp.json()
        assert pages_data["total_pages"] == 4

        # Clean up
        client.delete(f"/documents/{doc_id}")
