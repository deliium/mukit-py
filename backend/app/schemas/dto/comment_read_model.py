"""Read models for Comment entities."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentReadModel(BaseModel):
    """Read model for Comment."""

    id: uuid.UUID
    thread_id: uuid.UUID
    author_id: uuid.UUID
    parent_id: uuid.UUID | None
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CommentThreadReadModel(BaseModel):
    """Read model for CommentThread."""

    id: uuid.UUID
    document_id: uuid.UUID
    block_id: uuid.UUID | None
    position: str | None
    is_resolved: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
