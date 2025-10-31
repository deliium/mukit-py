from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    import uuid

    from app.models.comment import CommentThread
    from app.models.document import Document


class BlockType(enum.Enum):
    TEXT = "text"
    HEADING = "heading"
    TABLE = "table"
    CODE = "code"
    IMAGE = "image"
    LIST = "list"
    QUOTE = "quote"
    DIVIDER = "divider"


class Block(Base):
    __tablename__ = "blocks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), nullable=False
    )
    block_type: Mapped[BlockType] = mapped_column(Enum(BlockType), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False
    )  # Flexible content storage
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # Order in document
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("blocks.id")
    )  # For nested blocks
    block_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON
    )  # Additional block metadata

    # Relationships
    document: Mapped[Document] = relationship(back_populates="blocks")
    parent: Mapped[Block | None] = relationship(remote_side="Block.id")
    children: Mapped[list[Block]] = relationship(back_populates="parent")
    comment_threads: Mapped[list[CommentThread]] = relationship(back_populates="block")
