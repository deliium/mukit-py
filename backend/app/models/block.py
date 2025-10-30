from __future__ import annotations

import enum
import uuid
from typing import Optional

from sqlalchemy import JSON, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


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

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), nullable=False)
    block_type: Mapped[BlockType] = mapped_column(Enum(BlockType), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)  # Flexible content storage
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # Order in document
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("blocks.id"))  # For nested blocks
    block_metadata: Mapped[Optional[dict]] = mapped_column(JSON)  # Additional block metadata

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="blocks")
    parent: Mapped[Optional["Block"]] = relationship(remote_side="Block.id")
    children: Mapped[list["Block"]] = relationship(back_populates="parent")
    comment_threads: Mapped[list["CommentThread"]] = relationship(back_populates="block")
