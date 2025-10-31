"""Workspace service."""

import uuid

from fastapi import HTTPException

from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import Workspace
from app.services.dto import CreateWorkspaceDTO, UpdateWorkspaceDTO


class WorkspaceService:
    """Service for workspace business logic."""

    def __init__(self, workspace_repository: WorkspaceRepository):
        """Initialize service with workspace repository."""
        self.workspace_repository = workspace_repository

    async def create_workspace(
        self, dto: CreateWorkspaceDTO, current_user_id: uuid.UUID
    ) -> Workspace:
        """Create a new workspace."""
        # Validate that owner_id matches current_user_id
        if dto.owner_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You can only create workspaces for yourself"
            )

        # Check if slug is unique
        if await self.workspace_repository.exists_by_slug(dto.slug):
            raise HTTPException(status_code=400, detail="Workspace slug already exists")

        workspace_read = await self.workspace_repository.create(
            name=dto.name,
            description=dto.description,
            slug=dto.slug,
            owner_id=dto.owner_id,
        )

        # Add owner as workspace member
        await self.workspace_repository.add_member(
            workspace_id=workspace_read.id, user_id=dto.owner_id, role="owner"
        )

        return Workspace(
            id=workspace_read.id,
            name=workspace_read.name,
            description=workspace_read.description,
            slug=workspace_read.slug,
            avatar_url=workspace_read.avatar_url,
            owner_id=workspace_read.owner_id,
            created_at=workspace_read.created_at,
            updated_at=workspace_read.updated_at,
        )

    async def get_workspaces(self, current_user_id: uuid.UUID) -> list[Workspace]:
        """Get workspaces where user is a member."""
        workspaces_read = await self.workspace_repository.get_by_user_id(
            current_user_id
        )

        return [
            Workspace(
                id=ws.id,
                name=ws.name,
                description=ws.description,
                slug=ws.slug,
                avatar_url=ws.avatar_url,
                owner_id=ws.owner_id,
                created_at=ws.created_at,
                updated_at=ws.updated_at,
            )
            for ws in workspaces_read
        ]

    async def get_workspace(
        self, workspace_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> Workspace:
        """Get workspace by ID."""
        workspace_read = await self.workspace_repository.get_by_id(workspace_id)

        if not workspace_read:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Check if user has access to workspace
        member = await self.workspace_repository.get_member(
            workspace_id, current_user_id
        )
        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        return Workspace(
            id=workspace_read.id,
            name=workspace_read.name,
            description=workspace_read.description,
            slug=workspace_read.slug,
            avatar_url=workspace_read.avatar_url,
            owner_id=workspace_read.owner_id,
            created_at=workspace_read.created_at,
            updated_at=workspace_read.updated_at,
        )

    async def update_workspace(
        self,
        workspace_id: uuid.UUID,
        dto: UpdateWorkspaceDTO,
        current_user_id: uuid.UUID,
    ) -> Workspace:
        """Update workspace."""
        workspace_read = await self.workspace_repository.get_by_id(workspace_id)

        if not workspace_read:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Check if user is owner or admin
        member = await self.workspace_repository.get_member(
            workspace_id, current_user_id
        )
        if not member or member.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")

        updated_read = await self.workspace_repository.update(
            workspace_id=workspace_id,
            name=dto.name,
            description=dto.description,
            avatar_url=dto.avatar_url,
        )

        if not updated_read:
            raise HTTPException(status_code=404, detail="Workspace not found")

        return Workspace(
            id=updated_read.id,
            name=updated_read.name,
            description=updated_read.description,
            slug=updated_read.slug,
            avatar_url=updated_read.avatar_url,
            owner_id=updated_read.owner_id,
            created_at=updated_read.created_at,
            updated_at=updated_read.updated_at,
        )
