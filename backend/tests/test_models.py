"""Test models with String IDs for SQLite compatibility."""

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    avatar_url = Column(String(500))
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner")
    owned_documents = relationship("Document", back_populates="owner")
    document_permissions = relationship("Permission", back_populates="user")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces")
    documents = relationship("Document", back_populates="workspace")
    members = relationship("WorkspaceMember", back_populates="workspace")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(JSON, default=dict)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    owner = relationship("User", back_populates="owned_documents")
    workspace = relationship("Workspace", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document")
    permissions = relationship("Permission", back_populates="document")
    comment_threads = relationship("CommentThread", back_populates="document")
    blocks = relationship("Block", back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(JSON, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    change_summary = Column(Text)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )

    # Relationships
    document = relationship("Document", back_populates="versions")
    author = relationship("User")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    permission_type = Column(
        String(50), nullable=False
    )  # owner, editor, commentator, reader
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )

    # Relationships
    user = relationship("User", back_populates="document_permissions")
    document = relationship("Document", back_populates="permissions")


class CommentThread(Base):
    __tablename__ = "comment_threads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    block_id = Column(String(36), ForeignKey("blocks.id"))
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    document = relationship("Document", back_populates="comment_threads")
    block = relationship("Block", back_populates="comment_threads")
    author = relationship("User")
    comments = relationship("Comment", back_populates="thread")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(36), ForeignKey("comment_threads.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("comments.id"))
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    thread = relationship("CommentThread", back_populates="comments")
    parent = relationship("Comment", remote_side=[id])
    author = relationship("User")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    block_type = Column(String(50), nullable=False)  # text, heading, table, code, image
    content = Column(JSON, nullable=False)
    order_index = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.timezone("UTC", func.now()),
        onupdate=func.timezone("UTC", func.now()),
    )

    # Relationships
    document = relationship("Document", back_populates="blocks")
    comment_threads = relationship("CommentThread", back_populates="block")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)  # admin, member, viewer
    joined_at = Column(
        DateTime(timezone=True), server_default=func.timezone("UTC", func.now())
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User")
