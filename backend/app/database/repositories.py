from typing import Any, Dict, List, Optional
import uuid
from backend.app.database.database import get_db_connection


class DocumentRepository:
    """Data access layer for document records."""

    @staticmethod
    def create(
        id: str,
        filename: str,
        file_path: str,
        file_size_bytes: int = 0,
        page_count: int = 0,
        chunk_count: int = 0,
        processing_status: str = "PENDING"
    ) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO documents (id, filename, file_path, file_size_bytes, page_count, chunk_count, processing_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (id, filename, file_path, file_size_bytes, page_count, chunk_count, processing_status)
            )
            cursor.execute("SELECT * FROM documents WHERE id = ?", (id,))
            row = cursor.fetchone()
            return dict(row) if row else {}

    @staticmethod
    def get_by_id(doc_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def list_all() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def update_status(doc_id: str, status: str, page_count: Optional[int] = None, chunk_count: Optional[int] = None) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            updates = ["processing_status = ?", "updated_at = CURRENT_TIMESTAMP"]
            params: List[Any] = [status]
            if page_count is not None:
                updates.append("page_count = ?")
                params.append(page_count)
            if chunk_count is not None:
                updates.append("chunk_count = ?")
                params.append(chunk_count)
            params.append(doc_id)
            query = f"UPDATE documents SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, tuple(params))

    @staticmethod
    def delete(doc_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return cursor.rowcount > 0


class QueryRepository:
    """Data access layer for query history and citations."""

    @staticmethod
    def save_query(
        document_id: Optional[str],
        question: str,
        answer: str,
        confidence_score: float = 0.0,
        query_id: Optional[str] = None
    ) -> str:
        q_id = query_id or str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO queries (id, document_id, question, answer, confidence_score)
                VALUES (?, ?, ?, ?, ?)
                """,
                (q_id, document_id, question, answer, confidence_score)
            )
            return q_id

    @staticmethod
    def save_citation(
        query_id: str,
        document_id: str,
        page_number: int,
        section_title: str,
        chunk_id: str,
        snippet: str,
        relevance_score: float
    ) -> str:
        cit_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO citations (id, query_id, document_id, page_number, section_title, chunk_id, snippet, relevance_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (cit_id, query_id, document_id, page_number, section_title, chunk_id, snippet, relevance_score)
            )
            return cit_id

    @staticmethod
    def list_history(limit: int = 50) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT q.*, d.filename as document_name
                FROM queries q
                LEFT JOIN documents d ON q.document_id = d.id
                ORDER BY q.created_at DESC
                LIMIT ?
                """,
                (limit,)
            )
            queries = [dict(row) for row in cursor.fetchall()]
            for q in queries:
                cursor.execute(
                    """
                    SELECT page_number, section_title, chunk_id, snippet, relevance_score
                    FROM citations
                    WHERE query_id = ?
                    ORDER BY relevance_score DESC
                    """,
                    (q["id"],)
                )
                q["citations"] = [dict(c) for c in cursor.fetchall()]
            return queries
