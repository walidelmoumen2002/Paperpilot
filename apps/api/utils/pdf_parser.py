# apps/api/utils/pdf_parser.py
import io
import re
from typing import Any, Dict, List

from pypdf import PdfReader


def clean_text(text: str) -> str:
    """
    Basic cleaning: removes page numbers, weird spacing, and hyphens at line breaks.
    """
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

    text = re.sub(r"\n{2,}", "\n\n", text)

    # 3. Strip whitespace
    return text.strip()


def extract_sections_from_pdf(file_content: bytes) -> List[Dict[str, Any]]:
    reader = PdfReader(io.BytesIO(file_content))
    sections = []

    # On boucle sur les pages
    for i, page in enumerate(reader.pages):
        text = clean_text(page.extract_text())
        if text:
            # On crée une section pour chaque page
            sections.append({"title": f"Page {i + 1}", "content": text, "order": i + 1})

    return sections
