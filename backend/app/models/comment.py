from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CommentThread(Base):
    __tablename__ = "comment_threads"

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), nullable=False)
    block_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("blocks.id"))
    position: Mapped[Optional[str]] = mapped_column(String(100))  # Position in document (e.g., "line:10", "block:5")
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="comment_threads")
    block: Mapped[Optional["Block"]] = relationship(back_populates="comment_threads")
    comments: Mapped[list["Comment"]] = relationship(back_populates="thread")


class Comment(Base):
    __tablename__ = "comments"

    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("comment_threads.id"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("comments.id"))  # For nested comments
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    thread: Mapped["CommentThread"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")
    parent: Mapped[Optional["Comment"]] = relationship(remote_side="Comment.id")
    replies: Mapped[list["Comment"]] = relationship(back_populates="parent")
