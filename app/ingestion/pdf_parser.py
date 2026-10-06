import re
import zlib
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.utils.logging import logger
from app.models.document import (
    Document,
    Page,
    EmptyDocumentError,
    CorruptedPDFError,
    UnsupportedFileTypeError
)


class PDFParser:
    """
    Automotive Specification PDF Parser.
    Extracts text per page preserving exact 1-indexed page numbers and section headers.
    Detects scanned/empty pages and validates that extractable digital text is present.
    """

    MIN_PAGE_CHARACTERS = 20  # Threshold under which a page is treated as empty/scanned

    def __init__(self, min_char_threshold: int = MIN_PAGE_CHARACTERS):
        self.min_char_threshold = min_char_threshold

    def parse(
        self,
        file_path: Path,
        document_id: str,
        filename: Optional[str] = None,
        ecu_domain: Optional[str] = "ECU Specification",
        standard: Optional[str] = "AUTOSAR Classic 4.4"
    ) -> Document:
        """
        Parses document file into a normalized Document structure.
        Raises UnsupportedFileTypeError, CorruptedPDFError, or EmptyDocumentError if invalid.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        resolved_filename = filename or file_path.name
        suffix = file_path.suffix.lower()

        if suffix not in [".pdf", ".md", ".txt"]:
            raise UnsupportedFileTypeError(
                f"Unsupported file format '{suffix}'. Only PDF specifications (.pdf) are accepted."
            )

        if suffix == ".pdf":
            pages, doc_meta = self._parse_pdf(file_path, resolved_filename)
        else:
            pages, doc_meta = self._parse_text_or_markdown(file_path, resolved_filename)

        # Validate that the document contains extractable text
        non_empty_pages = [p for p in pages if not p.is_empty]
        total_text_chars = sum(len(p.text) for p in non_empty_pages)

        if len(non_empty_pages) == 0 or total_text_chars < self.min_char_threshold:
            raise EmptyDocumentError(
                f"The document '{resolved_filename}' contains {len(pages)} pages, but contains no extractable digital text. "
                f"The PDF may be an image-only scan or corrupted. "
                f"Please provide an AUTOSAR specification with a digital text layer."
            )

        empty_page_count = len(pages) - len(non_empty_pages)
        if empty_page_count > 0:
            logger.warning(
                f"Document '{resolved_filename}' contains {empty_page_count} empty or scanned pages "
                f"out of {len(pages)} total pages."
            )

        doc_meta.update({
            "ecu_domain": ecu_domain,
            "standard": standard,
            "total_characters": total_text_chars
        })

        return Document(
            document_id=document_id,
            filename=resolved_filename,
            file_path=str(file_path),
            file_size_bytes=file_path.stat().st_size,
            page_count=len(pages),
            empty_page_count=empty_page_count,
            metadata=doc_meta,
            pages=pages
        )

    def _parse_pdf(self, file_path: Path, filename: str) -> tuple[List[Page], Dict[str, Any]]:
        """Parses PDF using PyMuPDF (fitz) or pure-python fallback."""
        try:
            import fitz  # PyMuPDF
            return self._parse_with_pymupdf(file_path, filename)
        except ImportError:
            logger.info("PyMuPDF (fitz) not installed in current environment. Using native fallback parser.")
            return self._parse_pdf_fallback(file_path, filename)
        except Exception as e:
            logger.error(f"PyMuPDF failed ({e}). Attempting native fallback parser.")
            return self._parse_pdf_fallback(file_path, filename)

    def _parse_with_pymupdf(self, file_path: Path, filename: str) -> tuple[List[Page], Dict[str, Any]]:
        """Extracts text using PyMuPDF with font and layout block inspection."""
        import fitz
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise CorruptedPDFError(f"Could not open PDF '{filename}'. File is corrupted or invalid: {e}")

        pages: List[Page] = []
        current_section = "General Architecture"

        for page_idx in range(len(doc)):
            page_num = page_idx + 1  # 1-indexed
            fitz_page = doc[page_idx]

            # 1. Extract plain text
            raw_text = fitz_page.get_text("text").strip()

            # 2. Extract layout blocks to detect section headers
            detected_header = self._detect_header_from_pymupdf(fitz_page)
            if detected_header:
                current_section = detected_header

            is_empty = len(raw_text) < self.min_char_threshold

            pages.append(Page(
                page_number=page_num,
                text=raw_text,
                is_empty=is_empty,
                section=current_section,
                metadata={
                    "char_count": len(raw_text),
                    "word_count": len(raw_text.split()),
                    "detected_heading": detected_header
                }
            ))

        doc_meta = {
            "format": "PDF",
            "title": doc.metadata.get("title") or filename,
            "author": doc.metadata.get("author") or "OEM Engineering",
            "creator": doc.metadata.get("creator"),
            "producer": doc.metadata.get("producer")
        }
        doc.close()
        return pages, doc_meta

    def _detect_header_from_pymupdf(self, page) -> Optional[str]:
        """Inspects text blocks to identify architectural section headers."""
        try:
            blocks = page.get_text("blocks")
            for b in blocks[:6]:  # Check top blocks
                block_text = b[4].strip()
                if not block_text:
                    continue
                first_line = block_text.split("\n")[0].strip()
                if self._is_section_heading(first_line):
                    return self._clean_heading(first_line)
        except Exception:
            pass
        return None

    def _parse_pdf_fallback(self, file_path: Path, filename: str) -> tuple[List[Page], Dict[str, Any]]:
        """
        Pure-Python fallback PDF parser.
        Parses PDF object streams, decompresses FlateDecode streams, and extracts text operators.
        """
        try:
            with open(file_path, "rb") as f:
                data = f.read()
        except Exception as e:
            raise CorruptedPDFError(f"Unable to read file '{filename}': {e}")

        if not data.startswith(b"%PDF-"):
            raise CorruptedPDFError(f"File '{filename}' does not start with standard %PDF- header.")

        # Find page objects or page markers
        pages_content = self._extract_raw_pdf_pages(data)
        if not pages_content:
            # Fallback: attempt global text extraction
            all_text = self._extract_text_from_pdf_stream(data)
            pages_content = [all_text] if all_text else []

        pages: List[Page] = []
        current_section = "General Architecture"

        for idx, page_text in enumerate(pages_content, start=1):
            clean_text = page_text.strip()
            is_empty = len(clean_text) < self.min_char_threshold

            # Detect section heading from first lines
            lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
            for line in lines[:5]:
                if self._is_section_heading(line):
                    current_section = self._clean_heading(line)
                    break

            pages.append(Page(
                page_number=idx,
                text=clean_text,
                is_empty=is_empty,
                section=current_section,
                metadata={
                    "char_count": len(clean_text),
                    "word_count": len(clean_text.split())
                }
            ))

        doc_meta = {"format": "PDF", "parser": "native-stream-fallback"}
        return pages, doc_meta

    def _extract_raw_pdf_pages(self, data: bytes) -> List[str]:
        """Separates text by PDF /Page dictionary markers (excluding /Type /Pages)."""
        extracted_pages = []
        page_splits = re.split(rb"/Type\s*/Page(?![sS\w])", data)
        if len(page_splits) > 1:
            for p_chunk in page_splits[1:]:
                # Extract streams within this page object block
                text = self._extract_text_from_pdf_stream(p_chunk)
                extracted_pages.append(text)
        return extracted_pages

    def _extract_text_from_pdf_stream(self, data: bytes) -> str:
        """Extracts text literals and Tj/TJ operators from decompressed PDF streams."""
        text_parts = []
        stream_matches = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", data, re.DOTALL)

        for s in stream_matches:
            decompressed = s
            try:
                decompressed = zlib.decompress(s)
            except Exception:
                pass  # Stream was uncompressed or unsupported filter

            # Extract strings inside parentheses like (Hello World) Tj
            matches = re.findall(rb"\((.*?)\)\s*(?:Tj|'|\")", decompressed)
            for m in matches:
                try:
                    text_parts.append(m.decode("latin1", errors="ignore"))
                except Exception:
                    pass

            # Extract arrays like [(Hello) 10 (World)] TJ
            tj_matches = re.findall(rb"\[(.*?)\]\s*TJ", decompressed)
            for tm in tj_matches:
                inner_strings = re.findall(rb"\((.*?)\)", tm)
                for im in inner_strings:
                    try:
                        text_parts.append(im.decode("latin1", errors="ignore"))
                    except Exception:
                        pass

        # If no streams yielded text, check for plain ASCII/Latin1 text blocks
        if not text_parts:
            ascii_text = re.findall(rb"[A-Za-z0-9\s.,;:_\-/\(\)]{20,}", data)
            for at in ascii_text:
                try:
                    decoded = at.decode("ascii", errors="ignore").strip()
                    if len(decoded) > 30 and not decoded.startswith("%"):
                        text_parts.append(decoded)
                except Exception:
                    pass

        return "\n".join(text_parts).strip()

    def _parse_text_or_markdown(self, file_path: Path, filename: str) -> tuple[List[Page], Dict[str, Any]]:
        """Parses markdown or structured text files, preserving sections and page numbers."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            raise CorruptedPDFError(f"Could not read text file '{filename}': {e}")

        # Split on section headings or page break indicators
        raw_sections = re.split(r"(?=(?:^|\n)##\s+Section\s+)", content)
        pages: List[Page] = []
        current_section = "General Architecture"

        for idx, sec in enumerate(raw_sections, start=1):
            sec_text = sec.strip()
            if not sec_text:
                continue

            # Identify section title
            first_line = sec_text.split("\n")[0].strip("# ")
            if self._is_section_heading(first_line):
                current_section = self._clean_heading(first_line)

            pages.append(Page(
                page_number=idx,
                text=sec_text,
                is_empty=len(sec_text) < self.min_char_threshold,
                section=current_section,
                metadata={
                    "char_count": len(sec_text),
                    "word_count": len(sec_text.split())
                }
            ))

        doc_meta = {"format": "Markdown/Text", "source_file": filename}
        return pages, doc_meta

    @staticmethod
    def _is_section_heading(line: str) -> bool:
        """Determines if a text line represents an architectural section heading."""
        cleaned = line.strip().lower()
        if cleaned.startswith("section") or cleaned.startswith("chapter"):
            return True
        if re.match(r"^\d+\.\d+.*", cleaned):  # e.g., "4.2 CAN-FD Bus Matrix"
            return True
        if line.startswith("#") or line.startswith("##"):
            return True
        return False

    @staticmethod
    def _clean_heading(line: str) -> str:
        """Cleans and standardizes heading text."""
        return re.sub(r"^[#\s\d.:\-]+", "", line).strip() or line.strip()


pdf_parser = PDFParser()
