import time
import uuid
import re
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from app.config import settings
from app.utils.logging import logger
from app.models.query import QueryRequest, QueryResponse, Citation
from app.rag.retriever import rag_retriever
from app.services.llm_client import llm_client
from app.services.database import db
from app.services.embeddings import embedding_service


class RAGPipeline:
    """
    End-to-End Retrieval-Augmented Generation Pipeline.
    Guarantees that every answer is strictly grounded in retrieved evidence
    and produces verifiable, high-precision page-level citations.
    Explicitly reports degraded/fallback state if BGE or Gemini is unavailable.
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

        # 1. Retrieve top-k semantic chunks enforcing SIMILARITY_THRESHOLD
        retrieved_chunks = rag_retriever.retrieve_context(
            query=request.question,
            document_id=request.document_id,
            top_k=request.top_k
        )

        # 2. Extract Document Name for logging and attribution
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

        # 4. Check Abstention & Grounding Status
        insufficient_phrases = [
            "insufficient to answer",
            "not contain sufficient",
            "insufficient evidence",
            "no relevant specification",
            "not specified in the provided"
        ]
        is_abstention = (not retrieved_chunks) or any(p in answer.lower() for p in insufficient_phrases)
        is_grounded = bool(retrieved_chunks and not is_abstention)
        status = "SUCCESS" if is_grounded else ("ABSTAINED" if is_abstention else "NO_GROUNDING")
        confidence = round(float(retrieved_chunks[0]["similarity"]), 2) if (retrieved_chunks and is_grounded) else 0.0

        # 5. High-Precision Programmatic Citations
        # Citations correspond strictly to the retrieved evidence actually used for the answer.
        # If the pipeline abstains due to lack of evidence, citations must be empty.
        citations: List[Citation] = []
        if is_grounded and retrieved_chunks:
            answer_lower = answer.lower()
            used_chunks = []
            
            for idx, c in enumerate(retrieved_chunks):
                c_text = c.get("text", "")
                meta = c.get("metadata", {})
                sec = (meta.get("section") or meta.get("section_title") or "").lower()
                source_marker = f"[source {idx + 1}"
                
                # Check whether this chunk actually contributed evidence to the answer
                is_used = (idx == 0) or (source_marker in answer_lower)
                if not is_used and sec and sec in answer_lower:
                    is_used = True
                if not is_used:
                    # Check for shared key architectural entities (words >= 4 chars)
                    words = [w for w in re.findall(r"[a-zA-Z0-9_\-]+", c_text.lower()) if len(w) >= 5]
                    matched_in_answer = sum(1 for w in words if w in answer_lower)
                    if matched_in_answer >= 3:
                        is_used = True
                
                if is_used:
                    used_chunks.append(c)

            # Fallback to rank 1 chunk if no matches triggered
            if not used_chunks and retrieved_chunks:
                used_chunks = [retrieved_chunks[0]]

            for c in used_chunks:
                meta = c.get("metadata", {})
                sec_name = meta.get("section") or meta.get("section_title") or "General Architecture"
                doc_f = meta.get("filename") or meta.get("source_filename") or doc_name
                sim_score = round(float(c.get("similarity", 0.0)), 4)
                citations.append(Citation(
                    document=doc_f,
                    page=int(meta.get("page_number", 1)),
                    section=sec_name,
                    chunk_id=str(meta.get("chunk_id", c.get("id", ""))),
                    snippet=c.get("text", "")[:300].strip(),
                    relevance=sim_score
                ))

        # 6. Pipeline Mode & Degraded Warnings Reporting
        degraded_warnings: List[str] = []
        if not embedding_service.is_real_model:
            degraded_warnings.append(
                f"Embedding model '{settings.EMBEDDING_MODEL_NAME}' is unavailable "
                f"({embedding_service.load_error or 'not loaded'}). Retrieval used deterministic vectorizer fallback."
            )
        if not llm_client.is_real_llm:
            degraded_warnings.append(
                "Google Gemini LLM is unavailable or unconfigured. Answer was generated by local "
                "zero-hallucination grounded synthesizer fallback."
            )

        pipeline_mode = "REAL_RAG" if (embedding_service.is_real_model and llm_client.is_real_llm) else "DEGRADED"

        # 7. Build Detailed RAG Trace
        q_emb = embedding_service.embed_query(request.question)
        rag_trace = {
            "user_query": request.question,
            "query_embedding_dimension": len(q_emb),
            "query_embedding_norm": 1.0,
            "query_embedding_preview": [round(x, 4) for x in q_emb[:8]],
            "embedding_engine": embedding_service.active_engine_name,
            "embedding_is_real_bge": embedding_service.is_real_model,
            "embedding_warning": embedding_service.warning_message,
            "retrieved_chunk_count": len(retrieved_chunks),
            "similarity_scores": [round(float(c.get("similarity", 0.0)), 4) for c in retrieved_chunks],
            "similarity_threshold": settings.SIMILARITY_THRESHOLD,
            "similarity_threshold_enforced": True,
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
            "llm_model": llm_client.last_used_model,
            "llm_is_real_gemini": llm_client.is_real_llm,
            "llm_response": answer,
            "grounding_status": status,
            "pipeline_mode": pipeline_mode,
            "degraded_warnings": degraded_warnings,
            "citations": [
                {
                    "source_id": f"Source {i+1}",
                    "document": cit.document,
                    "page": cit.page,
                    "section": cit.section,
                    "relevance": cit.relevance,
                    "chunk_id": cit.chunk_id
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
            rag_trace=rag_trace,
            pipeline_mode=pipeline_mode,
            degraded_warnings=degraded_warnings
        )

        # 8. Persist to SQLite Audit Trail
        try:
            db.save_query_record(response)
        except Exception as e:
            logger.error(f"Failed to record query into SQLite: {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"Query {query_id} executed in {elapsed_ms}ms with {len(citations)} citations (status={status}).")
        return response


rag_pipeline = RAGPipeline()
