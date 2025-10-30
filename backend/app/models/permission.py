from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Permission(Base):
    __tablename__ = "permissions"

    document_id = Column(ForeignKey("documents.id"), nullable=False)  # type: ignore
    user_id = Column(ForeignKey("users.id"), nullable=False)  # type: ignore
    permission_type = Column(
        String(50),
        nullable=False,
    )  # owner, editor, commenter, viewer
    can_edit = Column(Boolean, default=False)
    can_comment = Column(Boolean, default=False)
    can_view = Column(Boolean, default=True)
    can_share = Column(Boolean, default=False)
    granted_by = Column(ForeignKey("users.id"))  # type: ignore
    expires_at = Column(DateTime)

    # Relationships
    document = relationship("Document", back_populates="permissions")
    user = relationship(
        "User",
        back_populates="document_permissions",
        foreign_keys=[user_id],
        overlaps="granter",
    )
    granter = relationship("User", foreign_keys=[granted_by], overlaps="user")
