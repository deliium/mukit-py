from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.schemas.dto import CommentReadModel, CommentThreadReadModel

if TYPE_CHECKING:
    import uuid

    from app.models.block import Block
    from app.models.document import Document
    from app.models.user import User


class CommentThread(Base):
    __tablename__ = "comment_threads"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), nullable=False
    )
    block_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("blocks.id"))
    position: Mapped[str | None] = mapped_column(
        String(100)
    )  # Position in document (e.g., "line:10", "block:5")
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    document: Mapped[Document] = relationship(back_populates="comment_threads")
    block: Mapped[Block | None] = relationship(back_populates="comment_threads")
    comments: Mapped[list[Comment]] = relationship(back_populates="thread")

    def to_read_model(self) -> CommentThreadReadModel:
        """Convert CommentThread model to CommentThreadReadModel."""
        return CommentThreadReadModel(
            id=self.id,
            document_id=self.document_id,
            block_id=self.block_id,
            position=self.position,
            is_resolved=self.is_resolved,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class Comment(Base):
    __tablename__ = "comments"

    thread_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("comment_threads.id"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("comments.id")
    )  # For nested comments
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    thread: Mapped[CommentThread] = relationship(back_populates="comments")
    author: Mapped[User] = relationship(back_populates="comments")
    parent: Mapped[Comment | None] = relationship(remote_side="Comment.id")
    replies: Mapped[list[Comment]] = relationship(back_populates="parent")

    def to_read_model(self) -> CommentReadModel:
        """Convert Comment model to CommentReadModel."""
        return CommentReadModel(
            id=self.id,
            thread_id=self.thread_id,
            author_id=self.author_id,
            parent_id=self.parent_id,
            content=self.content,
            is_edited=self.is_edited,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


__all__ = [
    "Comment",
    "CommentThread",
]
