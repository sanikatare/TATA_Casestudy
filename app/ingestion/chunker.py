import re
from typing import List, Dict, Any, Optional
from app.config import settings
from app.utils.logging import logger
from app.models.document import Document, Page, Chunk


class DocumentChunker:
    """
    Context-Aware, Page-Preserving Document Chunker for AUTOSAR HLD specifications.
    
    Principles:
    1. Does NOT blindly split at fixed character cutoffs.
    2. Respects semantic hierarchy: Sections -> Paragraphs -> List Items -> Sentences.
    3. Strictly preserves physical 1-indexed page numbers (never crosses page boundaries).
    4. Dynamically tracks section and heading transitions within pages.
    5. Avoids trivial/meaningless trailing fragments (< min_chunk_size).
    6. Attaches complete source traceability metadata to each chunk.
    """

    def __init__(
        self,
        chunk_size_tokens: Optional[int] = None,
        chunk_overlap_tokens: Optional[int] = None,
        min_chunk_chars: int = 80,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size_tokens = chunk_size or chunk_size_tokens or settings.CHUNK_SIZE
        self.chunk_overlap_tokens = chunk_overlap or chunk_overlap_tokens or settings.CHUNK_OVERLAP
        self.min_chunk_chars = min_chunk_chars

        # Approximate token-to-character ratio (1 token ≈ 4 characters in English technical text)
        self.target_char_size = self.chunk_size_tokens * 4
        self.overlap_char_size = self.chunk_overlap_tokens * 4

    def chunk_document(self, document: Document) -> List[Chunk]:
        """
        Chunks all non-empty pages of a document while preserving exact page citations.
        """
        all_chunks: List[Chunk] = []
        global_chunk_idx = 0

        for page in document.pages:
            if page.is_empty or not page.text.strip():
                continue

            page_chunks = self._chunk_page(
                document=document,
                page=page,
                start_chunk_idx=global_chunk_idx
            )

            all_chunks.extend(page_chunks)
            global_chunk_idx += len(page_chunks)

        logger.info(
            f"Chunked document '{document.filename}' ({document.page_count} pages) "
            f"into {len(all_chunks)} semantic chunks [target={self.chunk_size_tokens} tokens, overlap={self.chunk_overlap_tokens} tokens]."
        )
        return all_chunks

    def _chunk_page(
        self,
        document: Document,
        page: Page,
        start_chunk_idx: int
    ) -> List[Chunk]:
        """
        Chunks a single physical page.
        Enforces that chunks NEVER span across page boundaries, ensuring 100% faithful citations.
        """
        raw_text = page.text.strip()
        if len(raw_text) < self.min_chunk_chars:
            # Short single page: emit as one complete chunk
            chunk_id = f"chk_{document.document_id}_p{page.page_number}_{start_chunk_idx}"
            return [
                self._build_chunk(
                    chunk_id=chunk_id,
                    document=document,
                    page=page,
                    section=page.section or "General Architecture",
                    text=raw_text,
                    chunk_idx=start_chunk_idx
                )
            ]

        # 1. Decompose page text into semantic units (sections, paragraphs, tables)
        semantic_units = self._split_into_semantic_units(raw_text, default_section=page.section or "General")

        page_chunks: List[Chunk] = []
        current_chunk_text = ""
        chunk_section = page.section or "General Architecture"
        current_idx = start_chunk_idx

        for unit_text, unit_section in semantic_units:
            # If adding this unit exceeds target size and current chunk is non-empty
            if current_chunk_text and (len(current_chunk_text) + len(unit_text) + 2) > self.target_char_size:
                # Commit current chunk with its accumulated section
                chunk_id = f"chk_{document.document_id}_p{page.page_number}_{current_idx}"
                page_chunks.append(
                    self._build_chunk(
                        chunk_id=chunk_id,
                        document=document,
                        page=page,
                        section=chunk_section,
                        text=current_chunk_text.strip(),
                        chunk_idx=current_idx
                    )
                )
                current_idx += 1

                # Calculate overlap text from the tail of current chunk (prefer sentence boundary)
                overlap = self._extract_overlap(current_chunk_text, self.overlap_char_size)
                if overlap:
                    current_chunk_text = f"{overlap}\n\n{unit_text}"
                else:
                    current_chunk_text = unit_text
                chunk_section = unit_section or chunk_section
            else:
                if current_chunk_text:
                    current_chunk_text += f"\n\n{unit_text}"
                else:
                    current_chunk_text = unit_text
                    chunk_section = unit_section or chunk_section

        # Handle remaining trailing text
        if current_chunk_text.strip():
            remaining = current_chunk_text.strip()
            # If remaining text is too small and we already have chunks on this page, merge into previous chunk
            if len(remaining) < self.min_chunk_chars and page_chunks:
                last_chunk = page_chunks[-1]
                # Merge into last chunk if it doesn't cause excessive explosion (> 1.5x target)
                if len(last_chunk.text) + len(remaining) < (self.target_char_size * 1.5):
                    last_chunk.text += f"\n\n{remaining}"
                    last_chunk.metadata["char_count"] = len(last_chunk.text)
                    last_chunk.metadata["token_estimate"] = len(last_chunk.text) // 4
                else:
                    chunk_id = f"chk_{document.document_id}_p{page.page_number}_{current_idx}"
                    page_chunks.append(
                        self._build_chunk(
                            chunk_id=chunk_id,
                            document=document,
                            page=page,
                            section=chunk_section,
                            text=remaining,
                            chunk_idx=current_idx
                        )
                    )
            else:
                chunk_id = f"chk_{document.document_id}_p{page.page_number}_{current_idx}"
                page_chunks.append(
                    self._build_chunk(
                        chunk_id=chunk_id,
                        document=document,
                        page=page,
                        section=chunk_section,
                        text=remaining,
                        chunk_idx=current_idx
                    )
                )

        return page_chunks

    def _split_into_semantic_units(self, text: str, default_section: str) -> List[tuple[str, Optional[str]]]:
        """
        Splits text by structural boundaries:
        - Major headings (e.g., '### Section 4.2', 'Section 1:', '2.4 Safety Goals')
        - Paragraph double-newlines
        Returns list of (unit_text, detected_section).
        """
        # Split on paragraph breaks
        raw_paragraphs = re.split(r"\n\s*\n", text)
        units: List[tuple[str, Optional[str]]] = []
        current_heading = default_section

        for p in raw_paragraphs:
            p = p.strip()
            if not p:
                continue

            # Check if this paragraph starts with or contains a section header
            lines = p.split("\n")
            first_line = lines[0].strip()
            detected = self._extract_heading(first_line)
            if detected:
                current_heading = detected

            # If paragraph itself is excessively large (> target_char_size), split by sentences
            if len(p) > self.target_char_size:
                sentence_splits = self._split_by_sentences(p)
                for s in sentence_splits:
                    units.append((s, current_heading))
            else:
                units.append((p, current_heading))

        return units

    @staticmethod
    def _extract_heading(line: str) -> Optional[str]:
        """Recognizes AUTOSAR section and chapter headers."""
        cleaned = line.strip()
        lower = cleaned.lower()
        if lower.startswith("section") or lower.startswith("chapter"):
            return cleaned.strip("# :")
        if re.match(r"^(?:#+\s*)?\d+\.\d+.*", cleaned):
            return re.sub(r"^#+\s*", "", cleaned).strip()
        if cleaned.startswith("## ") or cleaned.startswith("### "):
            return cleaned.strip("# ").strip()
        return None

    @staticmethod
    def _split_by_sentences(text: str) -> List[str]:
        """Splits long blocks at sentence boundaries (. ! ?) without breaking words."""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        result = []
        for s in sentences:
            s = s.strip()
            if s:
                result.append(s)
        return result or [text]

    @staticmethod
    def _extract_overlap(chunk_text: str, overlap_size: int) -> str:
        """Extracts trailing text for overlap, prioritizing sentence start."""
        if len(chunk_text) <= overlap_size:
            return ""

        tail = chunk_text[-overlap_size:]
        # Find sentence boundary in tail
        match = re.search(r"[.!?]\s+([A-Z0-9].*)", tail)
        if match:
            return match.group(1).strip()

        # Fallback: start at word boundary
        space_idx = tail.find(" ")
        if space_idx != -1:
            return tail[space_idx + 1:].strip()
        return tail.strip()

    def _build_chunk(
        self,
        chunk_id: str,
        document: Document,
        page: Page,
        section: str,
        text: str,
        chunk_idx: int
    ) -> Chunk:
        """Constructs a fully-hydrated Chunk instance with rich metadata."""
        char_count = len(text)
        token_est = max(1, char_count // 4)
        word_count = len(text.split())

        version_val = document.metadata.get("version", "1.0") if hasattr(document, "metadata") and isinstance(document.metadata, dict) else "1.0"
        metadata = {
            "chunk_id": chunk_id,
            "document_id": document.document_id,
            "filename": document.filename,
            "source_filename": document.filename,
            "page_number": page.page_number,
            "section": section,
            "section_title": section,
            "version": version_val,
            "source_text": text,
            "char_count": char_count,
            "word_count": word_count,
            "token_estimate": token_est,
            "ecu_domain": document.metadata.get("ecu_domain", "ECU Specification") if hasattr(document, "metadata") and isinstance(document.metadata, dict) else "ECU Specification"
        }

        return Chunk(
            chunk_id=chunk_id,
            document_id=document.document_id,
            filename=document.filename,
            page_number=page.page_number,
            section=section,
            text=text,
            source_filename=document.filename,
            version=version_val,
            chunk_index=chunk_idx,
            metadata=metadata
        )

    # ==========================================================================
    # DEBUG MODE: Inspection Utility
    # ==========================================================================
    def inspect_chunks(self, document: Document, verbose: bool = True) -> Dict[str, Any]:
        """
        Debug inspection tool.
        Returns a detailed structural analysis of:
        - Original pages (lengths, previews)
        - Generated chunks (character counts, token estimates, sections)
        - Metadata verification
        """
        chunks = self.chunk_document(document)

        pages_summary = []
        for p in document.pages:
            p_chunks = [c for c in chunks if c.page_number == p.page_number]
            pages_summary.append({
                "page_number": p.page_number,
                "is_empty": p.is_empty,
                "char_length": len(p.text),
                "detected_section": p.section,
                "chunks_generated": len(p_chunks),
                "chunks": [
                    {
                        "chunk_id": c.chunk_id,
                        "chunk_index": c.chunk_index,
                        "char_size": len(c.text),
                        "token_estimate": c.metadata.get("token_estimate", len(c.text) // 4),
                        "section": c.section,
                        "preview": c.text[:120].replace("\n", " ") + "...",
                        "metadata": c.metadata
                    }
                    for c in p_chunks
                ]
            })

        inspection = {
            "document_id": document.document_id,
            "filename": document.filename,
            "total_pages": document.page_count,
            "empty_pages": document.empty_page_count,
            "total_chunks": len(chunks),
            "config": {
                "chunk_size_tokens": self.chunk_size_tokens,
                "chunk_overlap_tokens": self.chunk_overlap_tokens,
                "target_char_size": self.target_char_size,
                "min_chunk_chars": self.min_chunk_chars
            },
            "pages": pages_summary
        }

        if verbose:
            print("\n" + "=" * 70)
            print(f"CHUNKING DEBUG INSPECTOR: {document.filename}")
            print("=" * 70)
            print(f"Total Pages: {document.page_count} | Generated Chunks: {len(chunks)}")
            print(f"Config: {self.chunk_size_tokens} tokens (~{self.target_char_size} chars) | Overlap: {self.chunk_overlap_tokens} tokens")
            print("-" * 70)

            for p_info in pages_summary:
                print(f"\n[PAGE {p_info['page_number']}] ({p_info['char_length']} chars, Section: '{p_info['detected_section']}')")
                if p_info["is_empty"]:
                    print("  ⚠️ Page flagged as EMPTY/SCANNED (0 chunks generated)")
                    continue

                for c_info in p_info["chunks"]:
                    print(f"  ├── Chunk [{c_info['chunk_index']}]: {c_info['char_size']} chars (~{c_info['token_estimate']} tokens)")
                    print(f"  │   Section: '{c_info['section']}'")
                    print(f"  │   Preview: \"{c_info['preview']}\"")
            print("=" * 70 + "\n")

        return inspection


document_chunker = DocumentChunker()
