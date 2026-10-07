import unittest
from app.config import settings
from app.services.database import db
from app.services.vector_store import vector_store
from app.services.embeddings import embedding_service


class TestSystemHealth(unittest.TestCase):
    """
    Direct system health and component connectivity test suite.
    Runs without requiring FastAPI TestClient or external web framework dependencies.
    """

    def test_database_connection(self):
        """Verify SQLite database initialization and table availability."""
        conn = db.get_connection()
        self.assertIsNotNone(conn)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        self.assertIn("documents", tables)
        self.assertIn("queries", tables)
        self.assertIn("citations", tables)
        conn.close()

    def test_vector_store_health(self):
        """Verify vector store is ready and can accept embeddings."""
        self.assertIsNotNone(vector_store)
        test_chunk_id = "health_chk_01"
        test_text = "Gateway CAN-FD bus interface health check"
        vector_store.add_chunks(
            chunk_ids=[test_chunk_id],
            documents=[test_text],
            metadatas=[{"document_id": "health_doc", "page_number": 1, "filename": "health.pdf"}]
        )
        results = vector_store.search("CAN-FD bus interface", top_k=1, document_id="health_doc")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], test_chunk_id)
        vector_store.delete_by_document("health_doc")

    def test_embeddings_health(self):
        """Verify embedding service produces normalized 384-d vectors."""
        vec = embedding_service.embed_query("Central Gateway ECU")
        self.assertEqual(len(vec), 384)
        norm = sum(x * x for x in vec) ** 0.5
        self.assertAlmostEqual(norm, 1.0, places=2)

    def test_settings_configuration(self):
        """Verify system settings and environment paths."""
        self.assertEqual(settings.APP_NAME, "AUTOSAR HLD Document Analysis Assistant")
        self.assertEqual(settings.EMBEDDING_MODEL_NAME, "BAAI/bge-small-en-v1.5")
        self.assertGreaterEqual(settings.TOP_K_RETRIEVAL, 1)


if __name__ == "__main__":
    unittest.main()
