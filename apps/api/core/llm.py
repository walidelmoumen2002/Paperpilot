# apps/api/core/llm.py
import os
import time
from typing import List

from google import genai
from google.genai import errors
from google.genai import types
from pydantic import BaseModel, Field

# Configure client once at import time (Gemini Developer API)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


class SectionAnalysis(BaseModel):
    """Structured output for a paper section."""

    summary: str = Field(
        description="A concise summary of the section content in 2-3 sentences."
    )
    claims: List[str] = Field(
        description="List of 3-5 key claims, facts, or findings extracted from this section."
    )


def generate_section_summary(text_content: str) -> SectionAnalysis:
    """Send text to Gemini and return structured analysis."""
    if client is None:
        raise ValueError("GEMINI_API_KEY not set")

    prompt = (
        "You are an expert academic researcher. Analyze the following text from a research paper section.\n\n"
        "TEXT TO ANALYZE:\n"
        f"{text_content}\n\n"
        "Return JSON matching the schema: "
        "{summary: string, claims: string array}."
    )

    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SectionAnalysis,
                ),
            )
            return SectionAnalysis.model_validate_json(response.text)
        except errors.APIError as exc:
            last_error = exc
            # Handle rate limits with a short backoff then retry.
            if exc.code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    # If we exhausted retries, re-raise the last API error.
    if last_error:
        raise last_error
    raise RuntimeError("Failed to generate section summary for unknown reasons.")
