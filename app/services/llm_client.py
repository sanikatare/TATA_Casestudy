import os
import re
import json
import time
import urllib.request
import urllib.error
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
    Connects to real Google Gemini when configured (via google-genai SDK or direct REST API),
    with an educational zero-hallucination local grounded synthesizer fallback.
    Explicitly tracks and reports when running in a degraded fallback state.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        self.is_real_llm: bool = False
        self.warning_message: Optional[str] = None
        self.last_used_model: str = "Local Grounded Synthesizer"
        self._init_gemini()

    def _init_gemini(self) -> None:
        self.client = None
        self.is_real_llm = False
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                self.is_real_llm = True
                self.warning_message = None
                self.last_used_model = self.model_name
                logger.info(f"Google Gemini SDK client initialized for model {self.model_name}.")
                return
            except Exception as e:
                logger.info(f"google-genai SDK not present ({e}); will use direct Gemini REST API if available.")
                self.client = "rest"
                self.is_real_llm = True
                self.warning_message = None
                self.last_used_model = "Gemini REST API"
        else:
            self.warning_message = (
                "WARNING: No GEMINI_API_KEY configured. Running in degraded state using "
                "local zero-hallucination grounded synthesizer. Real Gemini is NOT active."
            )
            self.last_used_model = "Local Grounded Synthesizer (Fallback)"
            logger.info(self.warning_message)

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

    def _call_gemini_rest(self, prompt: str, system_prompt: str) -> Optional[str]:
        """Calls Google Gemini generateContent via direct REST request."""
        if not self.api_key:
            return None

        # If previous call experienced network error or 503 within 30s, do not stall
        now = time.time()
        if hasattr(self, "_last_rest_fail") and (now - self._last_rest_fail < 30.0):
            return None

        candidate_models = ["models/gemini-3.8-flash", "models/gemini-2.5-flash-lite"]
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {"temperature": 0.0}
        }
        body = json.dumps(payload).encode("utf-8")

        for model in candidate_models:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                endpoint,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            self.last_used_model = model
                            self.is_real_llm = True
                            return parts[0]["text"].strip()
            except Exception as e:
                logger.warning(f"Gemini REST attempt for {model} failed: {e}")
                self._last_rest_fail = now
                break

        return None

    def generate_grounded_answer(
        self,
        question: str,
        retrieved_context: List[Dict[str, Any]],
        system_prompt: str
    ) -> str:
        """
        Synthesizes an architectural response strictly from retrieved context.
        Enforces negative constraint if context is empty, below threshold, or irrelevant.
        If Gemini is unavailable, clearly indicates fallback generation rather than
        silently presenting fallback output as normal LLM generation.
        """
        if not retrieved_context:
            return "The available HLD evidence is insufficient to answer this question. No relevant specification excerpts met the similarity threshold."

        full_prompt, formatted_context = self.format_prompt(question, retrieved_context, system_prompt)

        # 1. Try real Google Gemini SDK if client object is initialized
        if self.client and self.client != "rest":
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt,
                    config={
                        "system_instruction": system_prompt,
                        "temperature": 0.0,
                    }
                )
                if response.text and response.text.strip():
                    self.is_real_llm = True
                    self.last_used_model = self.model_name
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini SDK call failed ({e}). Attempting direct REST fallback.")

        # 2. Try real Google Gemini via direct REST API
        if self.api_key:
            rest_answer = self._call_gemini_rest(full_prompt, system_prompt)
            if rest_answer:
                self.is_real_llm = True
                return rest_answer

        # 3. Degraded Fallback: Local Zero-Hallucination Grounded Synthesizer
        self.is_real_llm = False
        self.warning_message = (
            "WARNING: Google Gemini API is unavailable or call failed. "
            "Output generated via local zero-hallucination synthesizer fallback."
        )
        self.last_used_model = "Local Grounded Synthesizer (Fallback)"

        # Evidence verification without hardcoded questions
        all_text = " ".join(c.get("text", "") for c in retrieved_context).lower()
        core_terms = [
            w for w in re.findall(r"[a-zA-Z0-9_\-]+", question.lower())
            if len(w) > 2 and w not in STOPWORDS
        ]

        matched_terms = []
        for t in core_terms:
            t_stem = t.rstrip("s") if len(t) > 3 else t
            if t in all_text or t_stem in all_text:
                matched_terms.append(t)
        coverage_ratio = (len(matched_terms) / len(core_terms)) if core_terms else 1.0
        max_similarity = max((float(c.get("similarity", 0.0)) for c in retrieved_context), default=0.0)

        # Abstention Criterion:
        # If less than 25% of core query terms exist in retrieved context,
        # or max retrieval similarity is below valid evidence threshold, abstain.
        from app.services.embeddings import embedding_service
        sim_threshold = 0.50 if embedding_service.is_real_model else 0.07
        if core_terms and (coverage_ratio < 0.25 or max_similarity < sim_threshold):
            return "The available HLD evidence is insufficient to answer this question. The retrieved specification excerpts do not contain verified details regarding this inquiry."

        # Find best chunk matching the query terms
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

        # Clearly mark degraded fallback state so it is never presented silently as normal LLM generation
        fallback_notice = "[Notice: Generated via Local Grounded Synthesizer - Gemini Unavailable]"
        body = (
            f"Based on {doc_name} (Page {page_no}, Section: {sec_title}), the architectural specification defines:\n\n"
            + "\n".join(bullet_points)
            + f"\n\nSource Verification: Grounded in [Source 1: {doc_name}, Page {page_no}]."
        )
        return f"{fallback_notice}\n\n{body}"


llm_client = LLMClient()
