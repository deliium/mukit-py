"""Workspace repository for database access."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.dto import WorkspaceMemberReadModel, WorkspaceReadModel


class WorkspaceRepository:
    """Repository for Workspace entity."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        name: str,
        slug: str,
        owner_id: uuid.UUID,
        description: str | None = None,
    ) -> WorkspaceReadModel:
        """Create a new workspace."""
        db_workspace = Workspace(
            name=name,
            description=description,
            slug=slug,
            owner_id=owner_id,
        )
        self.db.add(db_workspace)
        await self.db.commit()
        await self.db.refresh(db_workspace)
        return db_workspace.to_read_model()

    async def get_by_id(self, workspace_id: uuid.UUID) -> WorkspaceReadModel | None:
        """Get workspace by ID."""
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()
        return workspace.to_read_model() if workspace else None

    async def get_by_slug(self, slug: str) -> WorkspaceReadModel | None:
        """Get workspace by slug."""
        result = await self.db.execute(select(Workspace).where(Workspace.slug == slug))
        workspace = result.scalar_one_or_none()
        return workspace.to_read_model() if workspace else None

    async def get_by_user_id(self, user_id: uuid.UUID) -> list[WorkspaceReadModel]:
        """Get workspaces where user is a member."""
        result = await self.db.execute(
            select(Workspace)
            .join(WorkspaceMember)
            .where(WorkspaceMember.user_id == user_id)
        )
        workspaces = result.scalars().all()
        return [ws.to_read_model() for ws in workspaces]

    async def update(
        self,
        workspace_id: uuid.UUID,
        name: str | None = None,
        description: str | None = None,
        avatar_url: str | None = None,
    ) -> WorkspaceReadModel | None:
        """Update workspace."""
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()
        if not workspace:
            return None

        if name is not None:
            workspace.name = name
        if description is not None:
            workspace.description = description
        if avatar_url is not None:
            workspace.avatar_url = avatar_url

        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace.to_read_model()

    async def exists_by_slug(self, slug: str) -> bool:
        """Check if workspace exists by slug."""
        result = await self.db.execute(select(Workspace).where(Workspace.slug == slug))
        return result.scalar_one_or_none() is not None

    async def add_member(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str,
    ) -> WorkspaceMemberReadModel:
        """Add a member to workspace."""
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
        )
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        return member.to_read_model()

    async def get_member(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> WorkspaceMemberReadModel | None:
        """Get workspace member."""
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        member = result.scalar_one_or_none()
        return member.to_read_model() if member else None
