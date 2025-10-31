"""Read models for Document entities."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class DocumentReadModel(BaseModel):
    """Read model for Document entity."""

    id: uuid.UUID
    title: str
    description: str | None = None
    content: dict[str, Any] | None = None
    owner_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    is_public: bool
    settings: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DocumentVersionReadModel(BaseModel):
    """Read model for DocumentVersion entity."""

    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    content: dict[str, Any]
    content_hash: str
    author_id: uuid.UUID
    change_description: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
