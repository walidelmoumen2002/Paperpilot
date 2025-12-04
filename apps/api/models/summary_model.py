from sqlmodel import SQLModel, Field, Relationship, JSON
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone


class Summary(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    section_id: UUID = Field(foreign_key="section.id", index=True)
    summary_text: str
    key_claims: List[str] = Field(default=[], sa_type=JSON)  # Liste de points clés
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model_used: str = "gemini-2.5-flash"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
