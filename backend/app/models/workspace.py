from __future__ import annotations

import uuid  # noqa: TC003
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.schemas.dto import WorkspaceMemberReadModel, WorkspaceReadModel

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class Workspace(Base):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Relationships
    owner: Mapped[User] = relationship(back_populates="owned_workspaces")
    members: Mapped[list[WorkspaceMember]] = relationship(back_populates="workspace")
    documents: Mapped[list[Document]] = relationship(back_populates="workspace")

    def to_read_model(self) -> WorkspaceReadModel:
        """Convert Workspace model to WorkspaceReadModel."""
        return WorkspaceReadModel(
            id=self.id,
            name=self.name,
            description=self.description,
            slug=self.slug,
            avatar_url=self.avatar_url,
            owner_id=self.owner_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # owner, admin, member

    # Relationships
    workspace: Mapped[Workspace] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="workspace_memberships")

    def to_read_model(self) -> WorkspaceMemberReadModel:
        """Convert WorkspaceMember model to WorkspaceMemberReadModel."""
        return WorkspaceMemberReadModel(
            id=self.id,
            workspace_id=self.workspace_id,
            user_id=self.user_id,
            role=self.role,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
