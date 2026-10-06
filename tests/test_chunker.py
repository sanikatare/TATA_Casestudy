import unittest
from pathlib import Path

from app.models.document import Document, Page, Chunk
from app.ingestion.chunker import DocumentChunker


class TestDocumentChunker(unittest.TestCase):
    """
    Unit test suite for the context-aware document chunking stage.
    """

    def setUp(self):
        # Create a synthetic multi-page document for controlled testing
        page1_text = (
            "Section 1: Central Gateway Overview\n\n"
            "The Central Zonal Gateway acts as the primary vehicle communication boundary.\n\n"
            "Software Components allocated:\n"
            "- PowertrainCoordination_SWC: Manages motor torque arbitration (ASIL-D).\n"
            "- Gateway_Router_SWC: Routes high-priority CAN-FD frames (ASIL-B).\n"
            "- BodyControl_SWC: Manages lighting and door lock states (QM)."
        )

        page2_text = (
            "Section 4.1: CAN-FD Bus Matrix Specifications\n\n"
            "CAN-FD Channel 0 is dedicated to drivetrain safety-critical communications.\n"
            "The nominal arbitration rate is 500 kbps, and the data phase rate is 2.0 Mbps.\n\n"
            "### Section 4.2: Port Interfaces and Data Elements\n\n"
            "Interface SR_TorqueRequest carries unqueued 16-bit torque values.\n"
            "Interface SR_VehicleSpeed broadcasts four-wheel wheel speed measurements."
        )

        page3_text = (
            "Section 5: Diagnostic Basic Software Configuration\n\n"
            "Diagnostic event reporting is centralized in the Diagnostic Event Manager (Dem).\n"
            "Client-Server port CS_DiagRoutine_Service provides routine control functions."
        )

        self.doc = Document(
            document_id="doc_chunk_test_100",
            filename="ECU_Zonal_Gateway_HLD.pdf",
            file_path="/mock/path/ECU_Zonal_Gateway_HLD.pdf",
            file_size_bytes=10240,
            page_count=3,
            empty_page_count=0,
            metadata={"ecu_domain": "Central Gateway", "standard": "AUTOSAR Classic 4.4"},
            pages=[
                Page(page_number=1, text=page1_text, section="Section 1: Central Gateway Overview"),
                Page(page_number=2, text=page2_text, section="Section 4.1: CAN-FD Bus Matrix Specifications"),
                Page(page_number=3, text=page3_text, section="Section 5: Diagnostic Basic Software Configuration"),
            ]
        )

    def test_chunk_attributes_completeness(self):
        """Requirement: Each chunk must contain chunk_id, document_id, page_number, section, text, source_filename, metadata."""
        chunker = DocumentChunker(chunk_size_tokens=256, chunk_overlap_tokens=32)
        chunks = chunker.chunk_document(self.doc)

        self.assertGreaterEqual(len(chunks), 3)
        for chunk in chunks:
            self.assertIsInstance(chunk, Chunk)
            self.assertTrue(chunk.chunk_id.startswith("chk_doc_chunk_test_100_"))
            self.assertEqual(chunk.document_id, "doc_chunk_test_100")
            self.assertIn(chunk.page_number, [1, 2, 3])
            self.assertTrue(len(chunk.section) > 0)
            self.assertTrue(len(chunk.text) > 20)
            self.assertEqual(chunk.source_filename, "ECU_Zonal_Gateway_HLD.pdf")
            self.assertIsInstance(chunk.metadata, dict)
            self.assertEqual(chunk.metadata["page_number"], chunk.page_number)
            self.assertEqual(chunk.metadata["source_filename"], "ECU_Zonal_Gateway_HLD.pdf")
            self.assertIn("token_estimate", chunk.metadata)
            self.assertIn("char_count", chunk.metadata)

    def test_strict_page_boundary_preservation(self):
        """Requirement: Chunks must never combine text across distinct physical pages."""
        chunker = DocumentChunker(chunk_size_tokens=60, chunk_overlap_tokens=10)
        chunks = chunker.chunk_document(self.doc)

        for chunk in chunks:
            # Chunks from Page 1 must not contain Page 2 or Page 3 terms
            if chunk.page_number == 1:
                self.assertNotIn("CAN-FD Channel 0 is dedicated", chunk.text)
                self.assertNotIn("Diagnostic Event Manager (Dem)", chunk.text)
            elif chunk.page_number == 2:
                self.assertNotIn("Section 1: Central Gateway Overview", chunk.text)
                self.assertNotIn("Diagnostic Event Manager (Dem)", chunk.text)
            elif chunk.page_number == 3:
                self.assertNotIn("Section 1: Central Gateway Overview", chunk.text)
                self.assertNotIn("CAN-FD Channel 0 is dedicated", chunk.text)

    def test_paragraph_aware_splitting(self):
        """Requirement: Do not blindly split every N characters. Split along semantic paragraph boundaries."""
        chunker = DocumentChunker(chunk_size_tokens=80, chunk_overlap_tokens=15)
        chunks = chunker.chunk_document(self.doc)

        for chunk in chunks:
            # Must not cut mid-word (no isolated word fragments at ends)
            self.assertFalse(chunk.text.startswith("Coordination_SWC"))
            self.assertFalse(chunk.text.endswith("Powertrain"))

    def test_dynamic_section_tracking(self):
        """Requirement: Maintain section/heading information where available within the same page."""
        # On Page 2, the text transitions from Section 4.1 to Section 4.2
        chunker = DocumentChunker(chunk_size_tokens=60, chunk_overlap_tokens=10)
        chunks = chunker.chunk_document(self.doc)

        page2_chunks = [c for c in chunks if c.page_number == 2]
        self.assertGreaterEqual(len(page2_chunks), 2)

        # First chunk on page 2 has Section 4.1
        self.assertIn("4.1", page2_chunks[0].section)
        # Later chunk after Section 4.2 header updates active section
        has_sec_42 = any("4.2" in c.section for c in page2_chunks)
        self.assertTrue(has_sec_42, "Subsequent chunk should dynamically reflect Section 4.2 heading")

    def test_configurable_chunk_size_and_overlap(self):
        """Requirement: Add configurable chunk size and overlap."""
        # Small chunk size -> more chunks
        small_chunker = DocumentChunker(chunk_size_tokens=50, chunk_overlap_tokens=10)
        small_chunks = small_chunker.chunk_document(self.doc)

        # Large chunk size -> fewer chunks
        large_chunker = DocumentChunker(chunk_size_tokens=500, chunk_overlap_tokens=50)
        large_chunks = large_chunker.chunk_document(self.doc)

        self.assertGreater(len(small_chunks), len(large_chunks))
        self.assertEqual(len(large_chunks), 3)  # Exactly 1 chunk per page when size is large

    def test_avoid_tiny_meaningless_chunks(self):
        """Requirement: Avoid extremely small meaningless chunks."""
        # Single page with a tiny leftover sentence at the end
        short_page = Page(
            page_number=1,
            text="This is paragraph one of the automotive ECU design specification.\n\n" * 4 + "Final short note.",
            section="Section 1"
        )
        single_doc = Document(
            document_id="doc_small_test",
            filename="tiny.pdf",
            pages=[short_page]
        )

        chunker = DocumentChunker(chunk_size_tokens=80, chunk_overlap_tokens=10, min_chunk_chars=80)
        chunks = chunker.chunk_document(single_doc)

        for chunk in chunks:
            self.assertGreaterEqual(len(chunk.text), 80, "No emitted chunk should be under min_chunk_chars")

    def test_debug_mode_inspector(self):
        """Requirement: Create debug mode allowing inspection of original page, generated chunks, chunk sizes, metadata."""
        chunker = DocumentChunker(chunk_size_tokens=256, chunk_overlap_tokens=32)
        debug_output = chunker.inspect_chunks(self.doc, verbose=False)

        self.assertIsInstance(debug_output, dict)
        self.assertEqual(debug_output["document_id"], "doc_chunk_test_100")
        self.assertEqual(debug_output["filename"], "ECU_Zonal_Gateway_HLD.pdf")
        self.assertEqual(debug_output["total_pages"], 3)
        self.assertGreaterEqual(debug_output["total_chunks"], 3)
        self.assertIn("config", debug_output)
        self.assertEqual(debug_output["config"]["chunk_size_tokens"], 256)

        # Verify page summaries
        self.assertEqual(len(debug_output["pages"]), 3)
        page1_debug = debug_output["pages"][0]
        self.assertEqual(page1_debug["page_number"], 1)
        self.assertGreater(page1_debug["char_length"], 100)
        self.assertGreater(page1_debug["chunks_generated"], 0)

        first_chunk_debug = page1_debug["chunks"][0]
        self.assertIn("char_size", first_chunk_debug)
        self.assertIn("token_estimate", first_chunk_debug)
        self.assertIn("section", first_chunk_debug)
        self.assertIn("preview", first_chunk_debug)
        self.assertIn("metadata", first_chunk_debug)


if __name__ == "__main__":
    unittest.main()
