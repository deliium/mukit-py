from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.document import Document, DocumentVersion
    from app.models.permission import Permission
    from app.models.workspace import Workspace, WorkspaceMember


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    owned_workspaces: Mapped[list[Workspace]] = relationship(back_populates="owner")
    workspace_memberships: Mapped[list[WorkspaceMember]] = relationship(
        back_populates="user"
    )
    owned_documents: Mapped[list[Document]] = relationship(back_populates="owner")
    document_permissions: Mapped[list[Permission]] = relationship(
        back_populates="user", foreign_keys="Permission.user_id"
    )
    comments: Mapped[list[Comment]] = relationship(back_populates="author")
    document_versions: Mapped[list[DocumentVersion]] = relationship(
        back_populates="author"
    )
