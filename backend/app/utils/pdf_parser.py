import os
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore

from backend.app.utils.logging import logger


@dataclass
class ExtractedTable:
    """Represents an extracted tabular structure from a PDF page."""
    table_index: int
    headers: List[str]
    rows: List[List[str]]
    markdown: str
    bbox: Optional[Tuple[float, float, float, float]] = None


@dataclass
class ExtractedBlock:
    """Represents a text or layout block within a page."""
    block_index: int
    bbox: Tuple[float, float, float, float]
    text: str
    block_type: int  # 0: text, 1: image/diagram


@dataclass
class ExtractedPage:
    """Represents a single extracted PDF page with preserved boundaries."""
    page_number: int  # 1-indexed
    text: str
    char_start: int
    char_end: int
    char_count: int
    sections: List[str] = field(default_factory=list)
    tables: List[Dict[str, Any]] = field(default_factory=list)
    blocks: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ExtractedDocument:
    """Complete document structure with page-level traceability."""
    filename: str
    file_path: str
    file_size_bytes: int
    total_pages: int
    total_characters: int
    pages: List[ExtractedPage] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    detected_sections: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Converts extracted document to standard dictionary."""
        return {
            "filename": self.filename,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "total_pages": self.total_pages,
            "total_characters": self.total_characters,
            "metadata": self.metadata,
            "detected_sections": self.detected_sections,
            "pages": [asdict(p) for p in self.pages],
        }


# Regular expressions for identifying AUTOSAR & engineering section headings
SECTION_HEADING_PATTERNS = [
    # e.g., "1. Scope", "1.1 System Overview", "3.2.1 Software Components"
    re.compile(r"^(?:(?:Chapter|Section)\s+)?(\d+(?:\.\d+)*\s+[A-Z][A-Za-z0-9\s\-_/]{2,60})$", re.MULTILINE),
    # e.g., "CHAPTER 2: SOFTWARE ARCHITECTURE"
    re.compile(r"^(?:CHAPTER|SECTION)\s+\d+[:\-–\s]+([A-Z0-9\s\-_/]{3,60})$", re.MULTILINE | re.IGNORECASE),
    # Capitalized engineering keywords: "SOFTWARE COMPONENT DESCRIPTION", "PORT INTERFACES"
    re.compile(r"^([A-Z][A-Z0-9\s\-_/]{4,50})$", re.MULTILINE),
    # AUTOSAR specific headings
    re.compile(r"^((?:AUTOSAR|BSW|RTE|SW-C|VFB|MCAL|DEM|DCM)\s+[\w\s\-_/]{3,60})$", re.MULTILINE | re.IGNORECASE),
]


def detect_section_headings(page_text: str) -> List[str]:
    """
    Detects architectural chapter and section headers within page text.
    Filters out noise and duplicates.
    """
    detected: List[str] = []
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    
    for line in lines:
        if len(line) < 3 or len(line) > 80:
            continue
            
        for pattern in SECTION_HEADING_PATTERNS:
            match = pattern.match(line)
            if match:
                header = match.group(1).strip()
                # Exclude purely numeric or single-word common noise
                if len(header) > 3 and not header.isdigit() and header not in detected:
                    detected.append(header)
                break

    return detected


def extract_tables_from_page(page: Any) -> List[ExtractedTable]:
    """
    Extracts tabular data using PyMuPDF table detection where available.
    Formats detected tables into clean GitHub-flavored markdown.
    """
    tables: List[ExtractedTable] = []
    try:
        tabs = page.find_tables()
        if tabs and len(tabs.tables) > 0:
            for t_idx, tab in enumerate(tabs.tables):
                extracted = tab.extract()
                if not extracted or len(extracted) == 0:
                    continue
                
                headers = [str(col).strip() if col is not None else "" for col in extracted[0]]
                # Filter out entirely empty rows
                rows: List[List[str]] = []
                for row in extracted[1:]:
                    cleaned_row = [str(cell).strip() if cell is not None else "" for cell in row]
                    if any(cleaned_row):
                        rows.append(cleaned_row)
                
                # Construct markdown table
                md_lines = []
                md_lines.append("| " + " | ".join(headers) + " |")
                md_lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
                for r in rows:
                    md_lines.append("| " + " | ".join(r) + " |")
                markdown_table = "\n".join(md_lines)

                bbox = tuple(tab.bbox) if hasattr(tab, "bbox") else None
                tables.append(ExtractedTable(
                    table_index=t_idx,
                    headers=headers,
                    rows=rows,
                    markdown=markdown_table,
                    bbox=bbox,
                ))
    except Exception as e:
        logger.debug(f"PyMuPDF table extraction notice on page {page.number + 1}: {e}")

    return tables


def parse_pdf(file_path: str | Path) -> ExtractedDocument:
    """
    Parses a PDF file using PyMuPDF, preserving:
    - Exact 1-indexed page boundaries
    - Section and chapter headers
    - Table representations in Markdown
    - Character start and end offsets
    - Text blocks and metadata
    
    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If file is not a valid or readable PDF.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found at: {path}")

    file_size = path.stat().st_size
    if file_size == 0:
        raise ValueError("Cannot parse empty 0-byte PDF file.")

    try:
        doc = fitz.open(str(path))
    except Exception as e:
        raise ValueError(f"Failed to open PDF document: {e}")

    try:
        if doc.is_encrypted:
            # Attempt blank password
            if not doc.authenticate(""):
                raise ValueError("PDF is encrypted and requires a password.")

        total_pages = len(doc)
        if total_pages == 0:
            raise ValueError("PDF contains no pages.")

        extracted_pages: List[ExtractedPage] = []
        all_detected_sections: List[str] = []
        current_offset = 0

        doc_meta = {
            "title": doc.metadata.get("title", "") if doc.metadata else "",
            "author": doc.metadata.get("author", "") if doc.metadata else "",
            "subject": doc.metadata.get("subject", "") if doc.metadata else "",
            "keywords": doc.metadata.get("keywords", "") if doc.metadata else "",
            "creator": doc.metadata.get("creator", "") if doc.metadata else "",
            "format": doc.metadata.get("format", "") if doc.metadata else "",
        }

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_number = page_idx + 1  # 1-indexed page numbering

            # 1. Extract raw text
            page_text = page.get_text("text") or ""
            char_count = len(page_text)
            char_start = current_offset
            char_end = current_offset + char_count
            current_offset = char_end

            # 2. Extract sections
            sections = detect_section_headings(page_text)
            for s in sections:
                if s not in all_detected_sections:
                    all_detected_sections.append(s)

            # 3. Extract tables
            tables = extract_tables_from_page(page)
            tables_dicts = [asdict(t) for t in tables]

            # 4. Extract layout blocks
            blocks_raw = page.get_text("blocks") or []
            blocks_structured: List[Dict[str, Any]] = []
            for b_idx, block in enumerate(blocks_raw):
                # block: (x0, y0, x1, y1, text, block_no, block_type)
                if len(block) >= 5:
                    blocks_structured.append({
                        "block_index": b_idx,
                        "bbox": (block[0], block[1], block[2], block[3]),
                        "text": block[4].strip() if isinstance(block[4], str) else "",
                        "type": block[6] if len(block) > 6 else 0,
                    })

            extracted_pages.append(ExtractedPage(
                page_number=page_number,
                text=page_text,
                char_start=char_start,
                char_end=char_end,
                char_count=char_count,
                sections=sections,
                tables=tables_dicts,
                blocks=blocks_structured,
            ))

        total_characters = current_offset

        logger.info(
            f"Successfully parsed PDF '{path.name}': {total_pages} pages, "
            f"{total_characters} characters, {len(all_detected_sections)} sections detected."
        )

        return ExtractedDocument(
            filename=path.name,
            file_path=str(path.resolve()),
            file_size_bytes=file_size,
            total_pages=total_pages,
            total_characters=total_characters,
            pages=extracted_pages,
            metadata=doc_meta,
            detected_sections=all_detected_sections,
        )

    finally:
        doc.close()
