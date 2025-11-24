from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID, uuid4


class Section(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    job_id: Optional[UUID] = Field(default=None, foreign_key="job.id")
    title: Optional[str] = Field(default=None, index=True)
    order: Optional[int] = Field(default=None, index=True)
    content: Optional[str] = Field(default=None, nullable=True)
    embeddings: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
