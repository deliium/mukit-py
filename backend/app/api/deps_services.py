"""Dependencies for service layer initialization."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.comment_repository import CommentRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.auth_service import AuthService
from app.services.comment_service import CommentService
from app.services.document_service import DocumentService
from app.services.workspace_service import WorkspaceService


def get_user_repository(
    db: AsyncSession = Depends(get_db),
) -> UserRepository:
    """Get user repository."""
    return UserRepository(db)


def get_document_repository(
    db: AsyncSession = Depends(get_db),
) -> DocumentRepository:
    """Get document repository."""
    return DocumentRepository(db)


def get_workspace_repository(
    db: AsyncSession = Depends(get_db),
) -> WorkspaceRepository:
    """Get workspace repository."""
    return WorkspaceRepository(db)


def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthService:
    """Get auth service."""
    return AuthService(user_repository)


def get_document_service(
    document_repository: DocumentRepository = Depends(get_document_repository),
    workspace_repository: WorkspaceRepository = Depends(get_workspace_repository),
) -> DocumentService:
    """Get document service."""
    return DocumentService(document_repository, workspace_repository)


def get_workspace_service(
    workspace_repository: WorkspaceRepository = Depends(get_workspace_repository),
) -> WorkspaceService:
    """Get workspace service."""
    return WorkspaceService(workspace_repository)


def get_comment_repository(
    db: AsyncSession = Depends(get_db),
) -> CommentRepository:
    """Get comment repository."""
    return CommentRepository(db)


def get_comment_service(
    comment_repository: CommentRepository = Depends(get_comment_repository),
    document_repository: DocumentRepository = Depends(get_document_repository),
    workspace_repository: WorkspaceRepository = Depends(get_workspace_repository),
) -> CommentService:
    """Get comment service."""
    return CommentService(comment_repository, document_repository, workspace_repository)
