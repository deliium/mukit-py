"""Comment repository for database access."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment, CommentThread
from app.schemas.dto import CommentReadModel, CommentThreadReadModel


class CommentRepository:
    """Repository for Comment entities."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create_thread(
        self,
        document_id: uuid.UUID,
        block_id: uuid.UUID | None = None,
        position: str | None = None,
    ) -> CommentThreadReadModel:
        """Create a new comment thread."""
        db_thread = CommentThread(
            document_id=document_id,
            block_id=block_id,
            position=position,
        )
        self.db.add(db_thread)
        await self.db.commit()
        await self.db.refresh(db_thread)
        return db_thread.to_read_model()

    async def get_thread_by_id(
        self, thread_id: uuid.UUID
    ) -> CommentThreadReadModel | None:
        """Get comment thread by ID."""
        result = await self.db.execute(
            select(CommentThread).where(CommentThread.id == thread_id)
        )
        thread = result.scalar_one_or_none()
        return thread.to_read_model() if thread else None

    async def get_threads_by_document(
        self, document_id: uuid.UUID
    ) -> list[CommentThreadReadModel]:
        """Get all comment threads for a document."""
        result = await self.db.execute(
            select(CommentThread)
            .where(CommentThread.document_id == document_id)
            .order_by(CommentThread.created_at.desc())
        )
        threads = result.scalars().all()
        return [thread.to_read_model() for thread in threads]

    async def update_thread(
        self,
        thread_id: uuid.UUID,
        is_resolved: bool | None = None,
        position: str | None = None,
    ) -> CommentThreadReadModel | None:
        """Update comment thread."""
        result = await self.db.execute(
            select(CommentThread).where(CommentThread.id == thread_id)
        )
        thread = result.scalar_one_or_none()
        if not thread:
            return None

        if is_resolved is not None:
            thread.is_resolved = is_resolved
        if position is not None:
            thread.position = position

        await self.db.commit()
        await self.db.refresh(thread)
        return thread.to_read_model()

    async def delete_thread(self, thread_id: uuid.UUID) -> bool:
        """Delete comment thread and all its comments."""
        result = await self.db.execute(
            select(CommentThread).where(CommentThread.id == thread_id)
        )
        thread = result.scalar_one_or_none()
        if not thread:
            return False

        # Delete all comments in the thread
        comments_result = await self.db.execute(
            select(Comment).where(Comment.thread_id == thread_id)
        )
        comments = comments_result.scalars().all()
        for comment in comments:
            await self.db.delete(comment)

        # Delete the thread
        await self.db.delete(thread)
        await self.db.commit()
        return True

    async def create_comment(
        self,
        thread_id: uuid.UUID,
        author_id: uuid.UUID,
        content: str,
        parent_id: uuid.UUID | None = None,
    ) -> CommentReadModel:
        """Create a new comment."""
        db_comment = Comment(
            thread_id=thread_id,
            author_id=author_id,
            content=content,
            parent_id=parent_id,
        )
        self.db.add(db_comment)
        await self.db.commit()
        await self.db.refresh(db_comment)
        return db_comment.to_read_model()

    async def get_comment_by_id(self, comment_id: uuid.UUID) -> CommentReadModel | None:
        """Get comment by ID."""
        result = await self.db.execute(select(Comment).where(Comment.id == comment_id))
        comment = result.scalar_one_or_none()
        return comment.to_read_model() if comment else None

    async def get_comments_by_thread(
        self, thread_id: uuid.UUID
    ) -> list[CommentReadModel]:
        """Get all comments in a thread (including nested replies)."""
        result = await self.db.execute(
            select(Comment)
            .where(Comment.thread_id == thread_id)
            .order_by(Comment.created_at.asc())
        )
        comments = result.scalars().all()
        return [comment.to_read_model() for comment in comments]

    async def get_comments_tree_by_thread(
        self, thread_id: uuid.UUID
    ) -> list[CommentReadModel]:
        """Get comments in a thread as a tree (only top-level comments)."""
        result = await self.db.execute(
            select(Comment)
            .where(Comment.thread_id == thread_id, Comment.parent_id.is_(None))
            .order_by(Comment.created_at.asc())
        )
        comments = result.scalars().all()
        return [comment.to_read_model() for comment in comments]

    async def get_replies(self, comment_id: uuid.UUID) -> list[CommentReadModel]:
        """Get all replies to a comment."""
        result = await self.db.execute(
            select(Comment)
            .where(Comment.parent_id == comment_id)
            .order_by(Comment.created_at.asc())
        )
        comments = result.scalars().all()
        return [comment.to_read_model() for comment in comments]

    async def update_comment(
        self,
        comment_id: uuid.UUID,
        content: str | None = None,
    ) -> CommentReadModel | None:
        """Update comment."""
        result = await self.db.execute(select(Comment).where(Comment.id == comment_id))
        comment = result.scalar_one_or_none()
        if not comment:
            return None

        if content is not None:
            comment.content = content
            comment.is_edited = True

        await self.db.commit()
        await self.db.refresh(comment)
        return comment.to_read_model()

    async def delete_comment(self, comment_id: uuid.UUID) -> bool:
        """Delete comment and all its replies."""
        result = await self.db.execute(select(Comment).where(Comment.id == comment_id))
        comment = result.scalar_one_or_none()
        if not comment:
            return False

        # Delete all replies first
        replies_result = await self.db.execute(
            select(Comment).where(Comment.parent_id == comment_id)
        )
        replies = replies_result.scalars().all()
        for reply in replies:
            await self.db.delete(reply)

        # Delete the comment
        await self.db.delete(comment)
        await self.db.commit()
        return True
