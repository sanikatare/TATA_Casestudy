import unittest
from pathlib import Path

from app.models.document import Document, Page, Chunk
from app.models.query import QueryRequest, QueryResponse
from app.ingestion.pdf_parser import PDFParser
from app.ingestion.chunker import DocumentChunker
from app.ingestion.service import IngestionService
from app.services.vector_store import vector_store
from app.services.embeddings import embedding_service
from app.services.database import db
from app.rag.retriever import rag_retriever
from app.rag.pipeline import rag_pipeline
from app.evaluation.benchmark import evaluator


class TestRAGPipelineEndToEnd(unittest.TestCase):
    """
    Unit and integration tests verifying the end-to-end RAG implementation:
    1. A document is embedded and indexed in ChromaDB / vector store.
    2. A query is embedded and retrieves top-k source chunks.
    3. Retrieved context is passed to the generation step.
    4. Citations correspond strictly to retrieved chunk metadata (document, page, section).
    5. Unsupported questions trigger appropriate abstention.
    6. Vector storage operations (add, search, delete, deduplication).
    """

    @classmethod
    def setUpClass(cls):
        cls.sample_pdf = Path("./data/documents/sample_autosar_hld.pdf")
        if not cls.sample_pdf.exists():
            from data.documents.generate_sample_pdf import main as gen_pdf
            gen_pdf()

        cls.ingestion_service = IngestionService()
        cls.result = cls.ingestion_service.ingest_file(
            file_path=cls.sample_pdf,
            filename="sample_autosar_hld.pdf",
            ecu_domain="Central Zonal Gateway",
            standard="AUTOSAR Classic 4.4"
        )
        cls.doc = cls.result["document"]
        cls.doc_id = cls.doc.document_id

    def test_1_document_embedded_and_indexed(self):
        """Verify document was chunked, embedded, and indexed into the vector store."""
        self.assertGreaterEqual(self.result["chunk_count"], 3)
        self.assertEqual(self.result["status"], "INDEXED")

        # Verify embedding dimension
        query_vec = embedding_service.embed_query("Powertrain coordination torque")
        self.assertEqual(len(query_vec), 384)

        # Search chunks directly from vector store
        chunks = vector_store.search("CAN-FD bus matrix", top_k=3, document_id=self.doc_id)
        self.assertGreater(len(chunks), 0)
        first_chunk = chunks[0]
        self.assertIn("id", first_chunk)
        self.assertIn("text", first_chunk)
        self.assertIn("metadata", first_chunk)
        self.assertIn("similarity", first_chunk)
        self.assertEqual(first_chunk["metadata"]["document_id"], self.doc_id)

    def test_2_query_retrieves_correct_source_chunks(self):
        """Verify vector retrieval returns top-k chunks with faithful metadata."""
        query = "What is the bitrate and payload configured for CAN-FD Channel 0?"
        retrieved = rag_retriever.retrieve_context(query, document_id=self.doc_id, top_k=3)

        self.assertGreater(len(retrieved), 0)
        self.assertLessEqual(len(retrieved), 3)

        # Check that CAN-FD relevant chunk is retrieved
        texts = " ".join(c["text"] for c in retrieved)
        self.assertTrue("can-fd" in texts.lower() or "500 kbps" in texts.lower() or "gateway" in texts.lower())

        # Check metadata fields
        for c in retrieved:
            meta = c["metadata"]
            self.assertIn("page_number", meta)
            self.assertIn("section_title", meta)
            self.assertIn("filename", meta)

    def test_3_retrieved_context_passed_to_generation(self):
        """Verify retrieved context is explicitly passed to LLM and prompt construction."""
        req = QueryRequest(
            question="Which SWC manages motor torque arbitration?",
            document_id=self.doc_id,
            top_k=3
        )
        resp = rag_pipeline.execute_query(req)

        self.assertIsInstance(resp, QueryResponse)
        self.assertTrue(len(resp.answer) > 20)
        self.assertGreater(len(resp.citations), 0)
        self.assertEqual(resp.status, "SUCCESS")

        # Answer should mention relevant component from retrieved chunk
        self.assertTrue(
            "powertrain" in resp.answer.lower() or "torque" in resp.answer.lower(),
            f"Expected component mentioned in answer, got: {resp.answer}"
        )

    def test_4_citations_correspond_to_retrieved_metadata(self):
        """Verify citation references match exact chunk metadata."""
        req = QueryRequest(
            question="Which module handles diagnostic events and DTCs?",
            document_id=self.doc_id,
            top_k=3
        )
        resp = rag_pipeline.execute_query(req)

        self.assertGreater(len(resp.citations), 0)
        for citation in resp.citations:
            self.assertEqual(citation.document, "sample_autosar_hld.pdf")
            self.assertIn(citation.page, [1, 2, 3])
            self.assertTrue(len(citation.snippet) > 0)
            self.assertGreaterEqual(citation.relevance, 0.0)
            self.assertLessEqual(citation.relevance, 1.0)

    def test_5_unsupported_questions_abstain_or_indicate_insufficient_evidence(self):
        """Verify that questions not in the specification yield abstention / insufficient evidence."""
        req = QueryRequest(
            question="What is the FlexRay cycle repetition parameter for suspension leveling?",
            document_id=self.doc_id,
            top_k=3
        )
        resp = rag_pipeline.execute_query(req)

        answer_lower = resp.answer.lower()
        self.assertTrue(
            "not contain sufficient" in answer_lower or "not specified" in answer_lower or "insufficient" in answer_lower,
            f"Expected abstention response, got: {resp.answer}"
        )

    def test_6_vector_store_delete_and_lifecycle(self):
        """Verify vector index lifecycle: add, count, delete."""
        test_doc_id = "doc-lifecycle-test"
        vector_store.add_chunks(
            chunk_ids=["chk_lc_1", "chk_lc_2"],
            documents=["Sample chunk 1 for lifecycle test", "Sample chunk 2 for lifecycle test"],
            metadatas=[{"document_id": test_doc_id, "page_number": 1}, {"document_id": test_doc_id, "page_number": 2}]
        )

        results_before = vector_store.search("lifecycle test", top_k=5, document_id=test_doc_id)
        self.assertEqual(len(results_before), 2)

        vector_store.delete_by_document(test_doc_id)
        results_after = vector_store.search("lifecycle test", top_k=5, document_id=test_doc_id)
        self.assertEqual(len(results_after), 0)

    def test_7_evaluation_benchmark_execution(self):
        """Verify that evaluation benchmark executes against ground-truth and outputs metrics."""
        summary = evaluator.run_benchmark()
        self.assertEqual(summary.total_questions, 10)
        self.assertTrue(summary.negative_constraint_passed)
        self.assertGreaterEqual(summary.average_latency_ms, 0.0)
        self.assertEqual(len(summary.results), 10)


if __name__ == "__main__":
    unittest.main()
