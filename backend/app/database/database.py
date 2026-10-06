import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from backend.app.config import settings
from backend.app.utils.logging import logger


def get_db_path() -> Path:
    """Returns the configured SQLite database file path."""
    return Path(settings.SQLITE_DB_PATH)


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Context manager yielding a SQLite connection configured with Row factory."""
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error during transaction: {e}")
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Initializes SQLite database tables and indexes for AUTOSAR documents, queries, and citations."""
    logger.info(f"Initializing database at {settings.SQLITE_DB_PATH}")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                page_count INTEGER NOT NULL DEFAULT 0,
                chunk_count INTEGER NOT NULL DEFAULT 0,
                processing_status TEXT NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Queries table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS queries (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                confidence_score REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # 3. Citations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS citations (
                id TEXT PRIMARY KEY,
                query_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                section_title TEXT DEFAULT 'Unknown Section',
                chunk_id TEXT NOT NULL,
                snippet TEXT NOT NULL,
                relevance_score REAL DEFAULT 0.0,
                FOREIGN KEY (query_id) REFERENCES queries (id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # Performance indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(processing_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_queries_doc_id ON queries(document_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_citations_query_id ON citations(query_id);")

    logger.info("Database schema initialized successfully.")
