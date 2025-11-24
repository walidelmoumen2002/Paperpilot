from sqlmodel import Field, SQLModel, Column, Enum
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime


class SourceType(str, enum.Enum):
    pdf = "pdf"
    url = "url"


class JobStatus(str, enum.Enum):
    processing = "processing"
    done = "done"
    error = "error"
    queued = "queued"


class Job(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    owner_user_id: str = Field(index=True)
    source_type: SourceType = Field(sa_column=Column(Enum(SourceType)))
    source_url: Optional[str] = Field(default=None, index=True)
    status: JobStatus = Field(
        sa_column=Column(Enum(JobStatus)), default=JobStatus.queued
    )
    progress: int = Field(default=0)
    summary: Optional[str] = Field(default=None, nullable=True)
    flashcards: Optional[str] = Field(default=None, nullable=True)
    quiz: Optional[str] = Field(default=None, nullable=True)
    error_message: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
