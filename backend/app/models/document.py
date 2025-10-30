from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    content: Mapped[Optional[dict]] = mapped_column(JSON)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("workspaces.id"))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[Optional[dict]] = mapped_column(JSON)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="owned_documents")
    workspace: Mapped[Optional["Workspace"]] = relationship(back_populates="documents")
    permissions: Mapped[list["Permission"]] = relationship(back_populates="document")
    versions: Mapped[list["DocumentVersion"]] = relationship(back_populates="document")
    blocks: Mapped[list["Block"]] = relationship(back_populates="document")
    comment_threads: Mapped[list["CommentThread"]] = relationship(back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256 hash
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    change_description: Mapped[Optional[str]] = mapped_column(String(500))

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="versions")
    author: Mapped["User"] = relationship(back_populates="document_versions")
