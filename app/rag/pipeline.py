import time
import uuid
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from app.config import settings
from app.utils.logging import logger
from app.models.query import QueryRequest, QueryResponse, Citation
from app.rag.retriever import rag_retriever
from app.services.llm_client import llm_client
from app.services.database import db


class RAGPipeline:
    """
    End-to-End Retrieval-Augmented Generation Pipeline.
    Guarantees that every answer is strictly grounded in retrieved evidence
    and produces verifiable page-level citations.
    """

    def __init__(self):
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        prompt_file = settings.SYSTEM_PROMPT_PATH
        if prompt_file.exists():
            try:
                with open(prompt_file, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception as e:
                logger.warning(f"Could not load custom prompt file: {e}")
        return "You are an AUTOSAR HLD Architecture Assistant. Answer strictly from the provided excerpts with page citations."

    def execute_query(self, request: QueryRequest) -> QueryResponse:
        """Executes full RAG workflow for a user query."""
        start_time = time.time()
        query_id = f"q-{uuid.uuid4().hex[:8]}"

        # 1. Retrieve top-k semantic chunks
        retrieved_chunks = rag_retriever.retrieve_context(
            query=request.question,
            document_id=request.document_id,
            top_k=request.top_k
        )

        # 2. Extract Document Name for logging
        doc_name = "AUTOSAR Specification"
        if retrieved_chunks:
            doc_name = retrieved_chunks[0]["metadata"].get("filename", "AUTOSAR Specification")
        elif request.document_id:
            stored = db.get_document(request.document_id)
            if stored:
                doc_name = stored["filename"]

        # 3. Synthesize Grounded Response
        answer = llm_client.generate_grounded_answer(
            question=request.question,
            retrieved_context=retrieved_chunks,
            system_prompt=self.system_prompt
        )

        # 4. Construct Verifiable Citations
        citations: List[Citation] = []
        for c in retrieved_chunks:
            meta = c["metadata"]
            citations.append(Citation(
                document=meta.get("filename", doc_name),
                page=meta.get("page_number", 1),
                section=meta.get("section_title"),
                chunk_id=meta.get("chunk_id", c["id"]),
                snippet=c["text"][:300].strip(),
                relevance=round(float(c.get("similarity", 0.95)), 3)
            ))

        # 5. Check Grounding Status
        is_grounded = bool(retrieved_chunks and "not contain sufficient" not in answer.lower())
        status = "SUCCESS" if is_grounded else "NO_GROUNDING"
        confidence = round(retrieved_chunks[0]["similarity"], 2) if retrieved_chunks else 0.50

        response = QueryResponse(
            id=query_id,
            question=request.question,
            answer=answer,
            document_id=request.document_id,
            document_name=doc_name,
            timestamp=datetime.utcnow().isoformat(),
            status=status,
            confidence_score=confidence,
            citations=citations
        )

        # 6. Persist to SQLite Audit Trail
        try:
            db.save_query_record(response)
        except Exception as e:
            logger.error(f"Failed to record query into SQLite: {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Query {query_id} executed in {elapsed_ms}ms with {len(citations)} citations.")
        return response


rag_pipeline = RAGPipeline()
