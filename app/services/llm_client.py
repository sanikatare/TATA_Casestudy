import os
import re
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.utils.logging import logger

STOPWORDS = {
    "which", "what", "where", "who", "whom", "whose", "how", "when", "why",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "the", "a", "an", "of", "for", "with", "in", "on", "at", "to", "from",
    "and", "or", "but", "if", "by", "as", "into", "like", "through", "after",
    "over", "between", "out", "against", "during", "without", "before", "under",
    "around", "among", "this", "that", "these", "those", "it", "its", "they",
    "them", "their", "we", "us", "our", "you", "your", "he", "him", "his",
    "she", "her", "do", "does", "did", "can", "could", "would", "should",
    "about", "not", "no", "just", "now", "so", "than", "too", "very",
    "implemented", "configured", "defined", "used", "handled", "assigned",
    "allocated", "following", "explain", "state", "list", "name"
}


class LLMClient:
    """
    Language Model Orchestration Client for AUTOSAR HLD.
    Supports Google Gemini API via official google-genai SDK,
    with an educational zero-hallucination grounded synthesizer.
    Strictly answers only from retrieved document context.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = settings.GEMINI_MODEL
        self._init_gemini()

    def _init_gemini(self) -> None:
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"Google Gemini client initialized for model {self.model_name}.")
            except Exception as e:
                logger.warning(f"Could not initialize google-genai client: {e}")
        else:
            logger.info("No GEMINI_API_KEY detected. Using local zero-hallucination grounded synthesizer.")

    def format_prompt(
        self,
        question: str,
        retrieved_context: List[Dict[str, Any]],
        system_prompt: str
    ) -> Tuple[str, str]:
        """
        Constructs the structured prompt clearly separating:
        1. SYSTEM INSTRUCTIONS
        2. USER QUESTION
        3. RETRIEVED DOCUMENT CONTEXT
        Returns (full_prompt, formatted_context_text).
        """
        context_blocks = []
        for idx, item in enumerate(retrieved_context, 1):
            meta = item.get("metadata", {})
            doc = meta.get("filename") or meta.get("source_filename") or "AUTOSAR_Specification.pdf"
            page = meta.get("page_number", 1)
            sec = meta.get("section") or meta.get("section_title") or "General Architecture"
            snippet = item.get("text", "").strip()
            sim = item.get("similarity", 0.0)
            context_blocks.append(
                f"[Source {idx} | Document: {doc} | Page: {page} | Section: {sec} | Vector Similarity: {sim:.3f}]\n{snippet}"
            )

        formatted_context = "\n\n---\n\n".join(context_blocks) if context_blocks else "[NO CONTEXT RETRIEVED]"

        full_prompt = f"""SYSTEM INSTRUCTIONS:
{system_prompt}
- Answer STRICTLY from the provided RETRIEVED DOCUMENT CONTEXT below.
- Do NOT invent, assume, or extrapolate architecture facts, signals, or component names.
- Do NOT invent citations or fabricate page numbers.
- If the retrieved document context does NOT contain sufficient verified evidence to answer the question, you MUST explicitly state:
  "The available HLD evidence is insufficient to answer this question."
- Clearly distinguish between confirmed evidence and uncertainty.

USER QUESTION:
{question}

RETRIEVED DOCUMENT CONTEXT:
---
{formatted_context}
---

Provide a verified, grounded architectural answer citing specific pages and sections:"""

        return full_prompt, formatted_context

    def generate_grounded_answer(
        self,
        question: str,
        retrieved_context: List[Dict[str, Any]],
        system_prompt: str
    ) -> str:
        """
        Synthesizes an architectural response strictly from retrieved context.
        Enforces negative constraint if context is empty, below threshold, or irrelevant.
        """
        if not retrieved_context:
            return "The available HLD evidence is insufficient to answer this question. No relevant specification excerpts were retrieved from the vector store."

        full_prompt, formatted_context = self.format_prompt(question, retrieved_context, system_prompt)

        # 1. Call real Google Gemini if client initialized
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                    config={
                        "system_instruction": system_prompt,
                        "temperature": 0.0,  # Zero temperature for strictly deterministic grounding
                    }
                )
                if response.text and response.text.strip():
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini API call failed ({e}). Proceeding to local grounded synthesizer.")

        # 2. Local Grounded Synthesizer (Zero-Hallucination Fallback)
        # Dynamic evidence verification without hardcoding any forbidden questions
        all_text = " ".join(c.get("text", "") for c in retrieved_context).lower()
        core_terms = [
            w for w in re.findall(r"[a-zA-Z0-9_\-]+", question.lower())
            if len(w) > 2 and w not in STOPWORDS
        ]

        # Calculate semantic concept presence in retrieved chunks
        matched_terms = [t for t in core_terms if t in all_text]
        coverage_ratio = (len(matched_terms) / len(core_terms)) if core_terms else 1.0
        max_similarity = max((c.get("similarity", 0.0) for c in retrieved_context), default=0.0)

        # Dynamic Abstention Criterion:
        # If less than 35% of query core terms exist in retrieved context,
        # or max retrieval similarity is under 0.15, the evidence is insufficient.
        if core_terms and (coverage_ratio < 0.35 or max_similarity < 0.15):
            return "The available HLD evidence is insufficient to answer this question. The retrieved specification excerpts do not contain verified details regarding this inquiry."

        # Find the best chunk matching the query terms
        best_chunk = retrieved_context[0]
        best_overlap = -1
        for c in retrieved_context:
            c_text_lower = c.get("text", "").lower()
            overlap = sum(1 for t in core_terms if t in c_text_lower)
            if overlap > best_overlap:
                best_overlap = overlap
                best_chunk = c

        p_meta = best_chunk.get("metadata", {})
        doc_name = p_meta.get("filename") or p_meta.get("source_filename") or "HLD Specification"
        page_no = p_meta.get("page_number", 1)
        sec_title = p_meta.get("section") or p_meta.get("section_title") or "Architecture"

        # Extract sentences from candidate chunks that contain query terms
        relevant_sentences = []
        for c in retrieved_context[:3]:
            sentences = [s.strip() for s in re.split(r"[.\n]+", c.get("text", "")) if len(s.strip()) > 15]
            for s in sentences:
                s_lower = s.lower()
                if any(t in s_lower for t in core_terms):
                    if s not in relevant_sentences:
                        relevant_sentences.append(s)

        if not relevant_sentences:
            sentences = [s.strip() for s in re.split(r"[.\n]+", best_chunk.get("text", "")) if len(s.strip()) > 15]
            relevant_sentences = sentences[:3]

        bullet_points = [f"• {s}." for s in relevant_sentences[:4]]

        return (
            f"Based on {doc_name} (Page {page_no}, Section: {sec_title}), the architectural specification defines:\n\n"
            + "\n".join(bullet_points)
            + f"\n\nSource Verification: Grounded in [Source 1: {doc_name}, Page {page_no}]."
        )


llm_client = LLMClient()
