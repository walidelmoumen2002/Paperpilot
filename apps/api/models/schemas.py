from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional, Union, Literal, Annotated
from uuid import UUID

from pydantic import BaseModel, HttpUrl, Field

from .job_model import JobStatus


class JobCreateResponse(BaseModel):
    job_id: UUID
    status: Literal["queued"]
    created_at: datetime


class JobStatusResponse(BaseModel):
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class LinkCreateRequest(BaseModel):
    url: HttpUrl
    owner_user_id: Optional[str] = None


class PDFCreateRequest(BaseModel):
    pdf_base64: str
    owner_user_id: Optional[str] = None


class JobResultsReady(BaseModel):
    status: Literal["done"]
    summary: str
    flashcards: List[Any]
    quiz: List[Any]


class JobResultsNotReady(BaseModel):
    status: Literal["queued", "processing", "error"]
    message: str


# Discriminated union on the `status` field for cleaner OpenAPI
JobResultsResponse = Annotated[
    Union[JobResultsReady, JobResultsNotReady],
    Field(discriminator="status"),
]


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: Optional[str] = None
