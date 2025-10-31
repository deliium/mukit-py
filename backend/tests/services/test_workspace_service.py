"""Tests for WorkspaceService."""

import uuid

import pytest
from fastapi import HTTPException

from app.repositories.workspace_repository import WorkspaceRepository
from app.services.dto import CreateWorkspaceDTO, UpdateWorkspaceDTO
from app.services.workspace_service import WorkspaceService


@pytest.mark.asyncio
class TestWorkspaceService:
    """Test WorkspaceService."""

    async def test_create_workspace(self, db_session, test_user):
        """Test creating a workspace."""
        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        dto = CreateWorkspaceDTO(
            name="New Workspace",
            slug="new-workspace",
            owner_id=test_user.id,
            description="Test workspace",
        )

        workspace = await workspace_service.create_workspace(
            dto, test_user.id
        )

        assert workspace.name == "New Workspace"
        assert workspace.slug == "new-workspace"
        assert workspace.owner_id == test_user.id

        # Verify owner is added as member
        member = await workspace_repository.get_member(
            workspace.id, test_user.id
        )
        assert member is not None
        assert member.role == "owner"

    async def test_create_workspace_duplicate_slug(
        self, db_session, test_user, test_workspace
    ):
        """Test creating workspace with duplicate slug."""
        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        dto = CreateWorkspaceDTO(
            name="Another Workspace",
            slug=test_workspace.slug,
            owner_id=test_user.id,
        )

        with pytest.raises(HTTPException) as exc_info:
            await workspace_service.create_workspace(dto, test_user.id)

        assert exc_info.value.status_code == 400
        assert "Workspace slug already exists" in str(exc_info.value.detail)

    async def test_create_workspace_wrong_owner(
        self, db_session, test_user
    ):
        """Test creating workspace with wrong owner_id."""
        from app.models.user import User as UserModel
        from app.core.security import get_password_hash

        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        dto = CreateWorkspaceDTO(
            name="New Workspace",
            slug="new-workspace",
            owner_id=other_user.id,  # Different owner
        )

        with pytest.raises(HTTPException) as exc_info:
            await workspace_service.create_workspace(dto, test_user.id)

        assert exc_info.value.status_code == 403

    async def test_get_workspaces(self, db_session, test_user, test_workspace):
        """Test getting workspaces for a user."""
        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        workspaces = await workspace_service.get_workspaces(test_user.id)

        assert len(workspaces) >= 1
        assert any(ws.id == test_workspace.id for ws in workspaces)

    async def test_get_workspace(self, db_session, test_user, test_workspace):
        """Test getting a specific workspace."""
        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        workspace = await workspace_service.get_workspace(
            test_workspace.id, test_user.id
        )

        assert workspace.id == test_workspace.id
        assert workspace.name == test_workspace.name

    async def test_get_workspace_access_denied(
        self, db_session, test_user, test_workspace
    ):
        """Test getting workspace by non-member is denied."""
        from app.models.user import User as UserModel
        from app.core.security import get_password_hash

        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        # Create another user (not a member)
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await workspace_service.get_workspace(
                test_workspace.id, other_user.id
            )

        assert exc_info.value.status_code == 403

    async def test_update_workspace(
        self, db_session, test_user, test_workspace
    ):
        """Test updating a workspace."""
        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        dto = UpdateWorkspaceDTO(name="Updated Workspace")

        updated = await workspace_service.update_workspace(
            test_workspace.id, dto, test_user.id
        )

        assert updated.name == "Updated Workspace"

    async def test_update_workspace_access_denied(
        self, db_session, test_user, test_workspace
    ):
        """Test updating workspace by non-admin is denied."""
        from app.models.user import User as UserModel
        from app.models.workspace import WorkspaceMember as WorkspaceMemberModel
        from app.core.security import get_password_hash

        workspace_repository = WorkspaceRepository(db_session)
        workspace_service = WorkspaceService(workspace_repository)

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        # Add as regular member (not admin)
        member = WorkspaceMemberModel(
            workspace_id=test_workspace.id,
            user_id=other_user.id,
            role="member",
        )
        db_session.add(member)
        await db_session.commit()

        dto = UpdateWorkspaceDTO(name="Hacked Name")

        with pytest.raises(HTTPException) as exc_info:
            await workspace_service.update_workspace(
                test_workspace.id, dto, other_user.id
            )

        assert exc_info.value.status_code == 403

