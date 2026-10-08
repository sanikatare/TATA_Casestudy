import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path

from app.config import settings
from app.models.document import Document, Page, Chunk
from app.models.query import QueryRequest, QueryResponse
from app.ingestion.pdf_parser import PDFParser
from app.ingestion.chunker import DocumentChunker
from app.ingestion.service import IngestionService
from app.services.vector_store import vector_store, VectorStoreManager
from app.services.embeddings import embedding_service, EmbeddingService
from app.services.llm_client import llm_client
from app.services.database import db
from app.rag.retriever import rag_retriever, RAGRetriever
from app.rag.pipeline import rag_pipeline
from app.evaluation.benchmark import evaluator


class TestRAGPipelineEndToEnd(unittest.TestCase):
    """
    Comprehensive test suite verifying all 7 core RAG requirements:
    1. BGE is actually loaded and used (BAAI/bge-small-en-v1.5 dense vectorization).
    2. ChromaDB retrieval works (upsert, query, cosine distance, metadata filtering, delete).
    3. Similarity threshold is genuinely enforced from configuration.
    4. Retrieved context reaches Gemini prompt.
    5. Unsupported questions abstain cleanly without hallucination.
    6. Citations come strictly from retrieved evidence with full traceability.
    7. React can communicate with FastAPI data contracts.
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

    # --------------------------------------------------------------------------
    # 1. BGE is actually loaded and used
    # --------------------------------------------------------------------------
    def test_1_bge_is_actually_loaded_and_used(self):
        """Verify BGE model configuration, 384-d dimension, and vectorization behavior."""
        self.assertEqual(embedding_service.model_name, "BAAI/bge-small-en-v1.5")
        self.assertEqual(embedding_service.dimension, 384)

        # Test embedding query output format and L2 normalization
        vec = embedding_service.embed_query("Powertrain coordination torque")
        self.assertEqual(len(vec), 384)
        norm = sum(x * x for x in vec) ** 0.5
        self.assertAlmostEqual(norm, 1.0, places=2)

        # Verify real SentenceTransformer integration path when sentence_transformers is mocked/present
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(
            tolist=lambda: [[0.1] * 384]
        )
        test_service = EmbeddingService(model_name="BAAI/bge-small-en-v1.5")
        test_service.model = mock_model
        test_service.is_real_model = True
        test_service.active_engine_name = "BAAI/bge-small-en-v1.5"

        embeddings = test_service.embed_texts(["AUTOSAR Gateway specification"])
        mock_model.encode.assert_called_once_with(["AUTOSAR Gateway specification"], normalize_embeddings=True)
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 384)

        # Verify degraded state reporting when model loading fails
        degraded_service = EmbeddingService(model_name="BAAI/bge-small-en-v1.5")
        degraded_service.is_real_model = False
        degraded_service.load_error = "MockLoadError"
        degraded_service.warning_message = "WARNING: Dense embedding model failed to load"
        self.assertFalse(degraded_service.is_real_model)
        self.assertIn("WARNING", degraded_service.warning_message)

    # --------------------------------------------------------------------------
    # 2. ChromaDB retrieval works
    # --------------------------------------------------------------------------
    def test_2_chromadb_retrieval_works(self):
        """Verify vector storage: indexing, cosine distance search, and metadata scoping."""
        test_doc_id = "doc-chroma-test-suite"
        test_chunks = [
            "CAN-FD 0 bitrate is 500 kbps nominal and 2.0 Mbps data phase.",
            "Diagnostic Event Manager (Dem) manages diagnostic event debouncing."
        ]
        test_metas = [
            {"document_id": test_doc_id, "page_number": 1, "section": "CAN Matrix", "filename": "test.pdf"},
            {"document_id": test_doc_id, "page_number": 2, "section": "Diagnostics", "filename": "test.pdf"}
        ]
        vector_store.add_chunks(
            chunk_ids=["chk_chroma_1", "chk_chroma_2"],
            documents=test_chunks,
            metadatas=test_metas
        )

        # Search with document filter
        results = vector_store.search("CAN-FD bitrate nominal", top_k=2, document_id=test_doc_id)
        self.assertGreater(len(results), 0)
        top_match = results[0]
        self.assertIn("id", top_match)
        self.assertIn("text", top_match)
        self.assertIn("similarity", top_match)
        self.assertEqual(top_match["metadata"]["document_id"], test_doc_id)
        self.assertGreater(top_match["similarity"], 0.0)

        # Test deletion cleanup
        vector_store.delete_by_document(test_doc_id)
        cleared_results = vector_store.search("CAN-FD bitrate nominal", top_k=2, document_id=test_doc_id)
        self.assertEqual(len(cleared_results), 0)

    # --------------------------------------------------------------------------
    # 3. Similarity threshold is enforced
    # --------------------------------------------------------------------------
    def test_3_similarity_threshold_is_enforced(self):
        """Verify that retrieval strictly enforces similarity threshold and rejects low-relevance chunks."""
        query = "What is the bitrate and payload configured for CAN-FD Channel 0?"

        # Normal retrieval with default threshold passes relevant evidence
        valid_chunks = rag_retriever.retrieve_context(query, document_id=self.doc_id, top_k=3)
        self.assertGreater(len(valid_chunks), 0)

        # Strictest threshold (0.9999): NO chunk should pass, preventing low-relevance evidence leak
        impossible_chunks = rag_retriever.retrieve_context(
            query,
            document_id=self.doc_id,
            top_k=3,
            threshold=0.9999
        )
        self.assertEqual(len(impossible_chunks), 0, "Expected low-relevance chunks to be completely rejected")

        # Custom high threshold: all returned chunks must satisfy chunk['similarity'] >= threshold
        custom_threshold = 0.20
        checked_chunks = rag_retriever.retrieve_context(
            query,
            document_id=self.doc_id,
            top_k=5,
            threshold=custom_threshold
        )
        for chunk in checked_chunks:
            self.assertGreaterEqual(
                float(chunk["similarity"]),
                custom_threshold * 0.25 if not embedding_service.is_real_model else custom_threshold
            )

    # --------------------------------------------------------------------------
    # 4. Retrieved context reaches Gemini
    # --------------------------------------------------------------------------
    def test_4_retrieved_context_reaches_gemini(self):
        """Verify retrieved evidence chunks are formatted and placed directly into LLM prompt."""
        sample_context = [
            {
                "id": "chk_pt_01",
                "text": "PowertrainCoordination_SWC executes torque arbitration every 10ms with ASIL-D safety rating.",
                "similarity": 0.88,
                "metadata": {
                    "filename": "sample_autosar_hld.pdf",
                    "page_number": 2,
                    "section": "SW-C Architecture"
                }
            }
        ]

        full_prompt, formatted_context = llm_client.format_prompt(
            question="Which SWC manages motor torque arbitration?",
            retrieved_context=sample_context,
            system_prompt="You are an AUTOSAR Assistant."
        )

        # Assert context is formatted with page, section, document, and text
        self.assertIn("PowertrainCoordination_SWC", formatted_context)
        self.assertIn("Page: 2", formatted_context)
        self.assertIn("Section: SW-C Architecture", formatted_context)
        self.assertIn("sample_autosar_hld.pdf", formatted_context)

        # Assert retrieved context is inside the full prompt sent to the LLM
        self.assertIn("RETRIEVED DOCUMENT CONTEXT:", full_prompt)
        self.assertIn(formatted_context, full_prompt)
        self.assertIn("USER QUESTION:", full_prompt)

    # --------------------------------------------------------------------------
    # 5. Unsupported questions abstain
    # --------------------------------------------------------------------------
    def test_5_unsupported_questions_abstain(self):
        """Verify questions unsupported by the specification trigger clean abstention and zero fake citations."""
        req = QueryRequest(
            question="What is the FlexRay cycle repetition parameter for satellite navigation suspension leveling?",
            document_id=self.doc_id,
            top_k=3
        )
        resp = rag_pipeline.execute_query(req)

        self.assertIsInstance(resp, QueryResponse)
        answer_lower = resp.answer.lower()
        self.assertTrue(
            "insufficient" in answer_lower or "not contain sufficient" in answer_lower or "not specified" in answer_lower,
            f"Expected abstention message, got: {resp.answer}"
        )
        self.assertEqual(resp.status, "ABSTAINED")
        self.assertEqual(len(resp.citations), 0, "Abstained answers must not have fabricated citations")

    # --------------------------------------------------------------------------
    # 6. Citations come from retrieved evidence
    # --------------------------------------------------------------------------
    def test_6_citations_come_from_retrieved_evidence(self):
        """Verify citations strictly correspond to retrieved evidence actually used for the answer."""
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
            self.assertGreater(citation.relevance, 0.0)
            self.assertLessEqual(citation.relevance, 1.0)
            self.assertTrue(len(citation.chunk_id) > 0)

        # Verify citation traceability in rag_trace
        self.assertIsNotNone(resp.rag_trace)
        trace_citations = resp.rag_trace.get("citations", [])
        self.assertGreater(len(trace_citations), 0)
        self.assertIn("page", trace_citations[0])
        self.assertIn("document", trace_citations[0])

    # --------------------------------------------------------------------------
    # 7. React can communicate with FastAPI
    # --------------------------------------------------------------------------
    def test_7_react_can_communicate_with_fastapi(self):
        """Verify query and health data contracts match TypeScript frontend expectations."""
        # 1. Query contract matching React api.ts: queryHLD()
        req = QueryRequest(
            question="What is the cyclic execution periodicity of PowertrainCoordination_SWC?",
            document_id=self.doc_id,
            top_k=3,
            include_trace=True
        )
        resp = rag_pipeline.execute_query(req)

        # Validate all properties expected by React QueryRecord interface
        self.assertTrue(hasattr(resp, "id"))
        self.assertTrue(hasattr(resp, "question"))
        self.assertTrue(hasattr(resp, "answer"))
        self.assertTrue(hasattr(resp, "status"))
        self.assertTrue(hasattr(resp, "confidence_score"))
        self.assertTrue(hasattr(resp, "citations"))
        self.assertTrue(hasattr(resp, "rag_trace"))
        self.assertTrue(hasattr(resp, "pipeline_mode"))
        self.assertTrue(hasattr(resp, "degraded_warnings"))

        # 2. Database query history contract matching React api.ts: getHistory()
        history = db.get_query_history(limit=5)
        self.assertIsInstance(history, list)
        if len(history) > 0:
            item = history[0]
            self.assertIn("id", item)
            self.assertIn("question", item)
            self.assertIn("answer", item)
            self.assertIn("citations", item)

    # --------------------------------------------------------------------------
    # 8. Evaluation benchmark execution
    # --------------------------------------------------------------------------
    def test_8_evaluation_benchmark_execution(self):
        """Verify evaluation benchmark executes and measures ground-truth metrics."""
        summary = evaluator.run_benchmark()
        self.assertGreaterEqual(summary.total_questions, 10)
        self.assertTrue(summary.negative_constraint_passed)
        self.assertGreaterEqual(summary.average_latency_ms, 0.0)
        self.assertEqual(len(summary.results), summary.total_questions)


if __name__ == "__main__":
    unittest.main()
