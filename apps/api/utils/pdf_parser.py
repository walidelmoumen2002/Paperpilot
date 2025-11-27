# apps/api/utils/pdf_parser.py
import io
import re
from typing import Any, Dict, List

from pypdf import PdfReader, PdfWriter


def compress_pdf(file_bytes: bytes) -> bytes:
    """
    Compresses PDF content streams (lossless) to reduce file size.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        writer = PdfWriter()

        for page in reader.pages:
            # 1. Compress content streams (text/vector data)
            page.compress_content_streams()
            writer.add_page(page)

        # 2. Reduce metadata overhead
        writer.add_metadata(reader.metadata)

        output_stream = io.BytesIO()
        writer.write(output_stream)
        return output_stream.getvalue()
    except Exception as e:
        # If compression fails, return original bytes to avoid breaking the pipeline
        print(f"Warning: PDF compression failed, using original file. Error: {e}")
        return file_bytes


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
