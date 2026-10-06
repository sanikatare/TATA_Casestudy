import sqlite3
from typing import List, Optional, Dict, Any
from pathlib import Path
from app.config import settings
from app.utils.logging import logger
from app.models.document import DocumentMetadata
from app.models.query import QueryResponse


class DatabaseManager:
    """
    SQLite Relational Persistence Layer.
    Stores document metadata, query logs, and verifiable citations.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path or settings.SQLITE_DB_PATH)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns SQLite connection with row_factory enabled for dictionary access."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def init_db(self) -> None:
        """Creates tables if they do not already exist."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self.get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    page_count INTEGER NOT NULL,
                    chunk_count INTEGER NOT NULL,
                    standard TEXT NOT NULL,
                    ecu_domain TEXT,
                    processing_status TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS queries (
                    id TEXT PRIMARY KEY,
                    document_id TEXT,
                    document_name TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    status TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS citations (
                    id TEXT PRIMARY KEY,
                    query_id TEXT NOT NULL,
                    document TEXT NOT NULL,
                    page INTEGER NOT NULL,
                    section TEXT,
                    chunk_id TEXT NOT NULL,
                    snippet TEXT NOT NULL,
                    relevance REAL NOT NULL,
                    FOREIGN KEY (query_id) REFERENCES queries (id) ON DELETE CASCADE
                );
            """)
            logger.info("SQLite database tables verified successfully.")

    # ------------------ Document Operations ------------------ #
    def save_document(self, doc: DocumentMetadata) -> None:
        with self.get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO documents 
                (id, filename, file_path, file_size_bytes, page_count, chunk_count, standard, ecu_domain, processing_status, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc.id, doc.filename, doc.file_path, doc.file_size_bytes,
                doc.page_count, doc.chunk_count, doc.standard, doc.ecu_domain,
                doc.processing_status, doc.uploaded_at
            ))

    def list_documents(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def delete_document(self, doc_id: str) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return True

    # ------------------ Query & Citation Operations ------------------ #
    def save_query_record(self, record: QueryResponse) -> None:
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO queries (id, document_id, document_name, question, answer, status, confidence_score, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.id, record.document_id, record.document_name,
                record.question, record.answer, record.status,
                record.confidence_score, record.timestamp
            ))

            for idx, c in enumerate(record.citations):
                cit_id = f"{record.id}_cit_{idx}"
                conn.execute("""
                    INSERT INTO citations (id, query_id, document, page, section, chunk_id, snippet, relevance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    cit_id, record.id, c.document, c.page, c.section, c.chunk_id, c.snippet, c.relevance
                ))

    def get_query_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            q_cursor = conn.execute("SELECT * FROM queries ORDER BY timestamp DESC LIMIT ?", (limit,))
            queries = [dict(row) for row in q_cursor.fetchall()]

            for q in queries:
                c_cursor = conn.execute("SELECT * FROM citations WHERE query_id = ?", (q["id"],))
                q["citations"] = [dict(row) for row in c_cursor.fetchall()]
            return queries


db = DatabaseManager()
