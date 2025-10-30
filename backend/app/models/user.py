from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    owned_workspaces: Mapped[list["Workspace"]] = relationship(back_populates="owner")
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship(
        back_populates="user"
    )
    owned_documents: Mapped[list["Document"]] = relationship(back_populates="owner")
    document_permissions: Mapped[list["Permission"]] = relationship(
        back_populates="user", foreign_keys="Permission.user_id"
    )
    comments: Mapped[list["Comment"]] = relationship(back_populates="author")
    document_versions: Mapped[list["DocumentVersion"]] = relationship(
        back_populates="author"
    )
