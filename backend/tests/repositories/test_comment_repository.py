"""Tests for CommentRepository."""

import uuid

import pytest

from app.repositories.comment_repository import CommentRepository


@pytest.mark.asyncio
class TestCommentRepository:
    """Test CommentRepository."""

    async def test_create_thread(self, db_session, test_document):
        """Test creating a comment thread."""
        repository = CommentRepository(db_session)

        thread = await repository.create_thread(
            document_id=test_document.id, position="pos:10"
        )

        assert thread.document_id == test_document.id
        assert thread.position == "pos:10"
        assert thread.is_resolved is False
        assert thread.id is not None

    async def test_get_thread_by_id(self, db_session, test_comment_thread):
        """Test getting a thread by ID."""
        repository = CommentRepository(db_session)

        thread = await repository.get_thread_by_id(test_comment_thread.id)

        assert thread is not None
        assert thread.id == test_comment_thread.id

    async def test_get_thread_by_id_not_found(self, db_session):
        """Test getting a non-existent thread."""
        repository = CommentRepository(db_session)

        thread = await repository.get_thread_by_id(uuid.uuid4())

        assert thread is None

    async def test_get_threads_by_document(
        self, db_session, test_document, test_comment_thread
    ):
        """Test getting threads by document."""
        repository = CommentRepository(db_session)

        threads = await repository.get_threads_by_document(test_document.id)

        assert len(threads) >= 1
        assert any(t.id == test_comment_thread.id for t in threads)

    async def test_update_thread(self, db_session, test_comment_thread):
        """Test updating a thread."""
        repository = CommentRepository(db_session)

        updated_thread = await repository.update_thread(
            test_comment_thread.id, is_resolved=True
        )

        assert updated_thread is not None
        assert updated_thread.is_resolved is True

    async def test_delete_thread(self, db_session, test_comment_thread):
        """Test deleting a thread."""
        repository = CommentRepository(db_session)

        result = await repository.delete_thread(test_comment_thread.id)

        assert result is True

        # Verify thread is deleted
        thread = await repository.get_thread_by_id(test_comment_thread.id)
        assert thread is None

    async def test_create_comment(self, db_session, test_user, test_comment_thread):
        """Test creating a comment."""
        repository = CommentRepository(db_session)

        comment = await repository.create_comment(
            thread_id=test_comment_thread.id,
            author_id=test_user.id,
            content="Test comment",
        )

        assert comment.thread_id == test_comment_thread.id
        assert comment.author_id == test_user.id
        assert comment.content == "Test comment"
        assert comment.id is not None

    async def test_create_reply(
        self, db_session, test_user, test_comment_thread, test_comment
    ):
        """Test creating a reply."""
        repository = CommentRepository(db_session)

        reply = await repository.create_comment(
            thread_id=test_comment_thread.id,
            author_id=test_user.id,
            content="This is a reply",
            parent_id=test_comment.id,
        )

        assert reply.parent_id == test_comment.id
        assert reply.content == "This is a reply"

    async def test_get_comment_by_id(self, db_session, test_comment):
        """Test getting a comment by ID."""
        repository = CommentRepository(db_session)

        comment = await repository.get_comment_by_id(test_comment.id)

        assert comment is not None
        assert comment.id == test_comment.id
        assert comment.content == test_comment.content

    async def test_get_comments_by_thread(
        self, db_session, test_comment_thread, test_comment
    ):
        """Test getting comments by thread."""
        repository = CommentRepository(db_session)

        comments = await repository.get_comments_by_thread(test_comment_thread.id)

        assert len(comments) >= 1
        assert any(c.id == test_comment.id for c in comments)

    async def test_get_comments_tree_by_thread(
        self, db_session, test_comment_thread, test_comment
    ):
        """Test getting comments tree by thread."""
        repository = CommentRepository(db_session)

        comments_tree = await repository.get_comments_tree_by_thread(
            test_comment_thread.id
        )

        assert len(comments_tree) >= 1
        assert any(c.id == test_comment.id for c in comments_tree)

    async def test_update_comment(self, db_session, test_comment):
        """Test updating a comment."""
        repository = CommentRepository(db_session)

        updated_comment = await repository.update_comment(
            test_comment.id, content="Updated content"
        )

        assert updated_comment is not None
        assert updated_comment.content == "Updated content"
        assert updated_comment.is_edited is True

    async def test_delete_comment(self, db_session, test_comment):
        """Test deleting a comment."""
        repository = CommentRepository(db_session)

        result = await repository.delete_comment(test_comment.id)

        assert result is True

        # Verify comment is deleted
        comment = await repository.get_comment_by_id(test_comment.id)
        assert comment is None
