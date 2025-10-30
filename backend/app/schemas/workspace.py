import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkspaceBase(BaseModel):
    name: str
    description: str | None = None
    slug: str


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    avatar_url: str | None = None


class WorkspaceInDB(WorkspaceBase):
    id: uuid.UUID
    avatar_url: str | None = None
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Workspace(WorkspaceInDB):
    pass


class WorkspaceMemberBase(BaseModel):
    role: str


class WorkspaceMemberCreate(WorkspaceMemberBase):
    user_id: uuid.UUID


class WorkspaceMember(WorkspaceMemberBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
