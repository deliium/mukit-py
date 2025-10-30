import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class DocumentBase(BaseModel):
    title: str
    description: str | None = None
    is_public: bool = False
    settings: dict[str, Any] | None = None


class DocumentCreate(DocumentBase):
    workspace_id: uuid.UUID | None = None
    content: dict[str, Any] | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content: dict[str, Any] | None = None
    is_public: bool | None = None
    settings: dict[str, Any] | None = None


class DocumentInDB(DocumentBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    workspace_id: uuid.UUID | None = None
    content: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Document(DocumentInDB):
    pass


class DocumentVersionBase(BaseModel):
    content: dict[str, Any]
    change_description: str | None = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersionInDB(DocumentVersionBase):
    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    content_hash: str
    author_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentVersion(DocumentVersionInDB):
    pass
