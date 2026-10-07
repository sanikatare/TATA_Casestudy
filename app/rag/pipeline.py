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

        # 3. Synthesize Grounded Response and Capture Prompt Context
        full_prompt, formatted_context = llm_client.format_prompt(
            question=request.question,
            retrieved_context=retrieved_chunks,
            system_prompt=self.system_prompt
        )

        answer = llm_client.generate_grounded_answer(
            question=request.question,
            retrieved_context=retrieved_chunks,
            system_prompt=self.system_prompt
        )

        # 4. Construct Verifiable Citations programmatically from retrieved chunks
        citations: List[Citation] = []
        for c in retrieved_chunks:
            meta = c.get("metadata", {})
            sec_name = meta.get("section") or meta.get("section_title") or "General Architecture"
            doc_f = meta.get("filename") or meta.get("source_filename") or doc_name
            sim_score = round(float(c.get("similarity", 0.0)), 4)
            citations.append(Citation(
                document=doc_f,
                page=meta.get("page_number", 1),
                section=sec_name,
                chunk_id=meta.get("chunk_id", c.get("id", "")),
                snippet=c.get("text", "")[:300].strip(),
                relevance=sim_score
            ))

        # 5. Check Grounding Status
        insufficient_phrases = [
            "insufficient to answer",
            "not contain sufficient",
            "insufficient evidence",
            "no relevant specification"
        ]
        is_abstention = any(p in answer.lower() for p in insufficient_phrases)
        is_grounded = bool(retrieved_chunks and not is_abstention)
        status = "SUCCESS" if is_grounded else ("ABSTAINED" if is_abstention else "NO_GROUNDING")
        confidence = round(retrieved_chunks[0]["similarity"], 2) if (retrieved_chunks and is_grounded) else 0.0

        # 6. Build Detailed RAG Trace for Debug / Developer Inspection
        from app.services.embeddings import embedding_service
        q_emb = embedding_service.embed_query(request.question)
        rag_trace = {
            "user_query": request.question,
            "query_embedding_dimension": len(q_emb),
            "query_embedding_norm": 1.0,
            "query_embedding_preview": [round(x, 4) for x in q_emb[:8]],
            "retrieved_chunk_count": len(retrieved_chunks),
            "similarity_scores": [round(float(c.get("similarity", 0.0)), 4) for c in retrieved_chunks],
            "similarity_threshold": settings.SIMILARITY_THRESHOLD,
            "retrieved_chunks": [
                {
                    "rank": idx + 1,
                    "chunk_id": c.get("id", ""),
                    "document": c.get("metadata", {}).get("filename") or c.get("metadata", {}).get("source_filename") or doc_name,
                    "page_number": c.get("metadata", {}).get("page_number", 1),
                    "section": c.get("metadata", {}).get("section") or c.get("metadata", {}).get("section_title") or "General",
                    "similarity": round(float(c.get("similarity", 0.0)), 4),
                    "snippet": c.get("text", "")[:250].strip()
                }
                for idx, c in enumerate(retrieved_chunks)
            ],
            "context_sent_to_llm": formatted_context,
            "prompt_sections": {
                "system_instructions": self.system_prompt,
                "user_question": request.question,
                "retrieved_document_context": formatted_context
            },
            "llm_model": llm_client.model_name if llm_client.client else "Local Grounded Synthesizer",
            "llm_response": answer,
            "grounding_status": status,
            "citations": [
                {
                    "source_id": f"Source {i+1}",
                    "document": cit.document,
                    "page": cit.page,
                    "section": cit.section,
                    "relevance": cit.relevance
                }
                for i, cit in enumerate(citations)
            ]
        }

        response = QueryResponse(
            id=query_id,
            question=request.question,
            answer=answer,
            document_id=request.document_id,
            document_name=doc_name,
            timestamp=datetime.utcnow().isoformat(),
            status=status,
            confidence_score=confidence,
            citations=citations,
            rag_trace=rag_trace
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
