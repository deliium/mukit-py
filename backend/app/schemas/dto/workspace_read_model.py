"""Read models for Workspace entities."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkspaceReadModel(BaseModel):
    """Read model for Workspace entity."""

    id: uuid.UUID
    name: str
    description: str | None = None
    slug: str
    avatar_url: str | None = None
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkspaceMemberReadModel(BaseModel):
    """Read model for WorkspaceMember entity."""

    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
