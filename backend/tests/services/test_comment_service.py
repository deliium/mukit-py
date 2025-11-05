"""Tests for CommentService."""

import uuid

import pytest
from fastapi import HTTPException

from app.repositories.comment_repository import CommentRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.comment_service import CommentService
from app.services.dto import (
    CreateCommentDTO,
    CreateCommentThreadDTO,
    UpdateCommentDTO,
    UpdateCommentThreadDTO,
)


@pytest.mark.asyncio
class TestCommentService:
    """Test CommentService."""

    async def test_create_thread(self, db_session, test_user, test_document):
        """Test creating a comment thread."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = CreateCommentThreadDTO(
            document_id=test_document.id,
            position="pos:10",
        )

        thread = await comment_service.create_thread(dto, test_user.id)

        assert thread.document_id == test_document.id
        assert thread.position == "pos:10"
        assert thread.is_resolved is False

    async def test_create_thread_without_access(self, db_session, test_user):
        """Test creating a thread without document access."""
        from app.models.document import Document as DocumentModel
        from app.models.user import User as UserModel

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password="hashed",
            is_active=True,
            is_verified=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        # Create private document by other user
        private_doc = DocumentModel(
            id=uuid.uuid4(),
            title="Private Doc",
            owner_id=other_user.id,
            is_public=False,
            content={"blocks": []},
        )
        db_session.add(private_doc)
        await db_session.commit()

        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = CreateCommentThreadDTO(document_id=private_doc.id, position="pos:10")

        with pytest.raises(HTTPException) as exc_info:
            await comment_service.create_thread(dto, test_user.id)

        assert exc_info.value.status_code == 403

    async def test_get_thread(
        self, db_session, test_user, test_document, test_comment_thread
    ):
        """Test getting a thread."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        thread = await comment_service.get_thread(test_comment_thread.id, test_user.id)

        assert thread.id == test_comment_thread.id
        assert thread.document_id == test_document.id

    async def test_get_threads_by_document(
        self, db_session, test_user, test_document, test_comment_thread
    ):
        """Test getting threads by document."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        threads = await comment_service.get_threads_by_document(
            test_document.id, test_user.id
        )

        assert len(threads) >= 1
        assert any(t.id == test_comment_thread.id for t in threads)

    async def test_update_thread(self, db_session, test_user, test_comment_thread):
        """Test updating a thread."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = UpdateCommentThreadDTO(is_resolved=True)

        updated_thread = await comment_service.update_thread(
            test_comment_thread.id, dto, test_user.id
        )

        assert updated_thread.is_resolved is True

    async def test_delete_thread(self, db_session, test_user, test_comment_thread):
        """Test deleting a thread."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        result = await comment_service.delete_thread(
            test_comment_thread.id, test_user.id
        )

        assert result is True

        # Verify thread is deleted
        thread = await comment_repository.get_thread_by_id(test_comment_thread.id)
        assert thread is None

    async def test_create_comment(self, db_session, test_user, test_comment_thread):
        """Test creating a comment."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = CreateCommentDTO(thread_id=test_comment_thread.id, content="New comment")

        comment = await comment_service.create_comment(dto, test_user.id)

        assert comment.thread_id == test_comment_thread.id
        assert comment.content == "New comment"
        assert comment.author_id == test_user.id

    async def test_create_reply(
        self, db_session, test_user, test_comment_thread, test_comment
    ):
        """Test creating a reply."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = CreateCommentDTO(
            thread_id=test_comment_thread.id,
            parent_id=test_comment.id,
            content="This is a reply",
        )

        reply = await comment_service.create_comment(dto, test_user.id)

        assert reply.parent_id == test_comment.id
        assert reply.content == "This is a reply"

    async def test_update_comment(self, db_session, test_user, test_comment):
        """Test updating a comment."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = UpdateCommentDTO(content="Updated content")

        updated_comment = await comment_service.update_comment(
            test_comment.id, dto, test_user.id
        )

        assert updated_comment.content == "Updated content"
        assert updated_comment.is_edited is True

    async def test_update_comment_by_non_owner(
        self, db_session, test_user, test_comment_other_user
    ):
        """Test updating a comment by non-owner."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        dto = UpdateCommentDTO(content="Unauthorized update")

        with pytest.raises(HTTPException) as exc_info:
            await comment_service.update_comment(
                test_comment_other_user.id, dto, test_user.id
            )

        assert exc_info.value.status_code == 403

    async def test_delete_comment(self, db_session, test_user, test_comment):
        """Test deleting a comment."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        result = await comment_service.delete_comment(test_comment.id, test_user.id)

        assert result is True

        # Verify comment is deleted
        comment = await comment_repository.get_comment_by_id(test_comment.id)
        assert comment is None

    async def test_delete_comment_by_non_owner(
        self, db_session, test_user, test_comment_other_user
    ):
        """Test deleting a comment by non-owner."""
        comment_repository = CommentRepository(db_session)
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        comment_service = CommentService(
            comment_repository, document_repository, workspace_repository
        )

        with pytest.raises(HTTPException) as exc_info:
            await comment_service.delete_comment(
                test_comment_other_user.id, test_user.id
            )

        assert exc_info.value.status_code == 403
