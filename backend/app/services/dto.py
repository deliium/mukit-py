"""DTO schemas for service layer (endpoints → services)."""

import uuid
from typing import Any

from pydantic import BaseModel, EmailStr


# Auth DTOs
class RegisterUserDTO(BaseModel):
    """DTO for user registration."""

    email: EmailStr
    password: str
    username: str
    first_name: str | None = None
    last_name: str | None = None
    bio: str | None = None


class LoginUserDTO(BaseModel):
    """DTO for user login."""

    email: EmailStr
    password: str


# Document DTOs
class CreateDocumentDTO(BaseModel):
    """DTO for creating a document."""

    title: str
    description: str | None = None
    content: dict[str, Any] | None = None
    workspace_id: uuid.UUID | None = None
    is_public: bool = False
    settings: dict[str, Any] | None = None
    owner_id: uuid.UUID


class UpdateDocumentDTO(BaseModel):
    """DTO for updating a document."""

    title: str | None = None
    description: str | None = None
    content: dict[str, Any] | None = None
    is_public: bool | None = None
    settings: dict[str, Any] | None = None


class DocumentFilterDTO(BaseModel):
    """DTO for filtering documents."""

    workspace_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None


# Workspace DTOs
class CreateWorkspaceDTO(BaseModel):
    """DTO for creating a workspace."""

    name: str
    description: str | None = None
    slug: str
    owner_id: uuid.UUID


class UpdateWorkspaceDTO(BaseModel):
    """DTO for updating a workspace."""

    name: str | None = None
    description: str | None = None
    avatar_url: str | None = None
