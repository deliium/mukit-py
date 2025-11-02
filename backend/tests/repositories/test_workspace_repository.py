"""Tests for WorkspaceRepository."""

import uuid

import pytest

from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.dto import WorkspaceMemberReadModel, WorkspaceReadModel


@pytest.mark.asyncio
class TestWorkspaceRepository:
    """Test WorkspaceRepository."""

    async def test_create_workspace(self, db_session, test_user):
        """Test creating a workspace."""
        repository = WorkspaceRepository(db_session)

        workspace_read = await repository.create(
            name="New Workspace",
            slug="new-workspace",
            owner_id=test_user.id,
            description="Test workspace",
        )

        assert isinstance(workspace_read, WorkspaceReadModel)
        assert workspace_read.name == "New Workspace"
        assert workspace_read.slug == "new-workspace"
        assert workspace_read.owner_id == test_user.id
        assert workspace_read.description == "Test workspace"
        assert workspace_read.id is not None

    async def test_get_by_id(self, db_session, test_workspace):
        """Test getting workspace by ID."""
        repository = WorkspaceRepository(db_session)

        workspace_read = await repository.get_by_id(test_workspace.id)

        assert workspace_read is not None
        assert workspace_read.id == test_workspace.id
        assert workspace_read.name == test_workspace.name

    async def test_get_by_id_nonexistent(self, db_session):
        """Test getting workspace by nonexistent ID."""
        repository = WorkspaceRepository(db_session)

        workspace_read = await repository.get_by_id(uuid.uuid4())

        assert workspace_read is None

    async def test_get_by_slug(self, db_session, test_workspace):
        """Test getting workspace by slug."""
        repository = WorkspaceRepository(db_session)

        workspace_read = await repository.get_by_slug(test_workspace.slug)

        assert workspace_read is not None
        assert workspace_read.slug == test_workspace.slug
        assert workspace_read.id == test_workspace.id

    async def test_get_by_user_id(self, db_session, test_user, test_workspace):
        """Test getting workspaces by user ID."""
        repository = WorkspaceRepository(db_session)

        workspaces_read = await repository.get_by_user_id(test_user.id)

        assert len(workspaces_read) >= 1
        assert any(ws.id == test_workspace.id for ws in workspaces_read)

    async def test_update_workspace(self, db_session, test_workspace):
        """Test updating a workspace."""
        repository = WorkspaceRepository(db_session)

        updated_read = await repository.update(
            workspace_id=test_workspace.id,
            name="Updated Workspace",
            description="Updated description",
        )

        assert updated_read is not None
        assert updated_read.name == "Updated Workspace"
        assert updated_read.description == "Updated description"

    async def test_exists_by_slug(self, db_session, test_workspace):
        """Test checking if workspace exists by slug."""
        repository = WorkspaceRepository(db_session)

        assert await repository.exists_by_slug(test_workspace.slug) is True
        assert await repository.exists_by_slug("nonexistent-slug") is False

    async def test_add_member(self, db_session, test_workspace, test_user):
        """Test adding a workspace member."""
        repository = WorkspaceRepository(db_session)

        member_read = await repository.add_member(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            role="member",
        )

        assert isinstance(member_read, WorkspaceMemberReadModel)
        assert member_read.workspace_id == test_workspace.id
        assert member_read.user_id == test_user.id
        assert member_read.role == "member"

    async def test_get_member(
        self, db_session, test_workspace, test_user
    ):
        """Test getting a workspace member."""
        repository = WorkspaceRepository(db_session)

        # Member should exist (created in test_workspace fixture)
        member_read = await repository.get_member(
            workspace_id=test_workspace.id, user_id=test_user.id
        )

        assert member_read is not None
        assert member_read.user_id == test_user.id
        assert member_read.workspace_id == test_workspace.id

    async def test_get_member_nonexistent(self, db_session, test_workspace):
        """Test getting a nonexistent workspace member."""
        repository = WorkspaceRepository(db_session)

        member_read = await repository.get_member(
            workspace_id=test_workspace.id, user_id=uuid.uuid4()
        )

        assert member_read is None


