import unittest
from pathlib import Path

try:
    import pytest
except ImportError:
    pytest = None

from app.models.document import (
    Document,
    Page,
    Chunk,
    EmptyDocumentError,
    UnsupportedFileTypeError
)
from app.ingestion.pdf_parser import PDFParser
from app.ingestion.chunker import DocumentChunker
from app.ingestion.service import IngestionService


def get_sample_pdf_path() -> Path:
    path = Path("./data/documents/sample_autosar_hld.pdf")
    if not path.exists():
        from data.documents.generate_sample_pdf import main
        main()
    return path


def get_empty_pdf_path() -> Path:
    path = Path("./data/documents/scanned_empty_sample.pdf")
    if not path.exists():
        from data.documents.generate_sample_pdf import main
        main()
    return path


class TestDocumentIngestion(unittest.TestCase):
    def setUp(self):
        self.sample_pdf = get_sample_pdf_path()
        self.empty_pdf = get_empty_pdf_path()
        self.parser = PDFParser()
        self.chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        self.service = IngestionService()

    def test_parse_valid_pdf(self):
        doc = self.parser.parse(
            file_path=self.sample_pdf,
            document_id="doc_test_101",
            ecu_domain="Central Zonal Gateway",
            standard="AUTOSAR Classic 4.4"
        )
        self.assertIsInstance(doc, Document)
        self.assertEqual(doc.document_id, "doc_test_101")
        self.assertEqual(doc.page_count, 3)
        self.assertEqual(doc.empty_page_count, 0)
        self.assertEqual(len(doc.pages), 3)

        for idx, page in enumerate(doc.pages, start=1):
            self.assertIsInstance(page, Page)
            self.assertEqual(page.page_number, idx)
            self.assertFalse(page.is_empty)
            self.assertTrue(len(page.text) > 20)

        self.assertIn("PowertrainCoordination_SWC", doc.pages[0].text)
        self.assertIn("CAN-FD", doc.pages[1].text)
        self.assertIn("Dem", doc.pages[2].text)

    def test_empty_scanned_pdf_error(self):
        with self.assertRaises(EmptyDocumentError) as ctx:
            self.parser.parse(file_path=self.empty_pdf, document_id="doc_empty_102")
        self.assertIn("contains no extractable digital text", str(ctx.exception))

    def test_unsupported_file_extension(self):
        invalid_file = Path("./data/documents/test_invalid.docx")
        invalid_file.write_text("Dummy content")
        try:
            with self.assertRaises(UnsupportedFileTypeError) as ctx:
                self.parser.parse(file_path=invalid_file, document_id="doc_invalid")
            self.assertIn("Unsupported file format", str(ctx.exception))
        finally:
            if invalid_file.exists():
                invalid_file.unlink()

    def test_page_preserving_chunking(self):
        doc = self.parser.parse(file_path=self.sample_pdf, document_id="doc_chunk_103")
        chunks = self.chunker.chunk_document(doc)

        self.assertTrue(len(chunks) >= 3)
        for chunk in chunks:
            self.assertIsInstance(chunk, Chunk)
            self.assertEqual(chunk.document_id, "doc_chunk_103")
            self.assertIn(chunk.page_number, [1, 2, 3])
            self.assertNotEqual(chunk.section, "")
            self.assertTrue(len(chunk.text) > 0)
            self.assertEqual(chunk.metadata["page_number"], chunk.page_number)
            self.assertEqual(chunk.metadata["document_id"], "doc_chunk_103")

    def test_ingestion_service_end_to_end(self):
        result = self.service.ingest_file(
            file_path=self.sample_pdf,
            filename="sample_autosar_hld.pdf",
            ecu_domain="Central Gateway",
            standard="AUTOSAR Classic 4.4"
        )
        self.assertEqual(result["status"], "INDEXED")
        self.assertEqual(result["page_count"], 3)
        self.assertEqual(result["empty_pages"], 0)
        self.assertTrue(result["chunk_count"] >= 3)
        self.assertIsInstance(result["document"], Document)
        self.assertEqual(len(result["chunks"]), result["chunk_count"])


if __name__ == "__main__":
    unittest.main()
