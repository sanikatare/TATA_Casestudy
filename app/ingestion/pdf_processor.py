from typing import List, Dict, Any
from pathlib import Path
from app.utils.logging import logger


class PDFProcessor:
    """
    Page-preserving document extractor.
    Extracts text per page while recording exact page numbers and section headers.
    """

    @staticmethod
    def extract_document(file_path: Path) -> List[Dict[str, Any]]:
        """
        Parses document file (PDF or Markdown/Text) and returns a list of pages:
        [{ "page_number": int, "text": str, "section": str }]
        """
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            return PDFProcessor._extract_pdf(file_path)
        else:
            return PDFProcessor._extract_text_or_markdown(file_path)

    @staticmethod
    def _extract_pdf(file_path: Path) -> List[Dict[str, Any]]:
        pages_data = []
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            current_section = "General Overview"

            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_text = page.get_text()

                # Basic heuristic to capture section headers from page top
                lines = [line.strip() for line in page_text.split("\n") if line.strip()]
                for line in lines[:5]:
                    if line.lower().startswith("section") or line.startswith("##"):
                        current_section = line.strip("# ")
                        break

                pages_data.append({
                    "page_number": page_idx + 1,
                    "text": page_text,
                    "section": current_section
                })
            doc.close()
            logger.info(f"PyMuPDF extracted {len(pages_data)} pages from {file_path.name}")
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed ({e}). Attempting plain text fallback.")
            pages_data = PDFProcessor._extract_text_or_markdown(file_path)
        return pages_data

    @staticmethod
    def _extract_text_or_markdown(file_path: Path) -> List[Dict[str, Any]]:
        """Splits markdown or text file into simulated pages based on section markers."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            return []

        # Split on section headings or form feeds
        sections = content.split("## Section ")
        pages = []
        if len(sections) > 1:
            # First preamble
            if sections[0].strip():
                pages.append({
                    "page_number": 1,
                    "text": sections[0].strip(),
                    "section": "Preamble & Executive Scope"
                })
            for idx, sec in enumerate(sections[1:], start=2):
                header_line = sec.split("\n")[0].strip()
                sec_title = f"Section {header_line}"
                pages.append({
                    "page_number": idx,
                    "text": f"## Section {sec.strip()}",
                    "section": sec_title
                })
        else:
            # Divide into 1,000-character pages
            chunks = [content[i:i+1500] for i in range(0, len(content), 1500)]
            for idx, c in enumerate(chunks, start=1):
                pages.append({
                    "page_number": idx,
                    "text": c.strip(),
                    "section": f"Part {idx}"
                })

        logger.info(f"Extracted {len(pages)} logical sections/pages from {file_path.name}")
        return pages


pdf_processor = PDFProcessor()
