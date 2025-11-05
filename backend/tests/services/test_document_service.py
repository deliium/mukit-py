"""Tests for DocumentService."""

import uuid

import pytest
from fastapi import HTTPException

from app.repositories.document_repository import DocumentRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.document_service import DocumentService
from app.services.dto import CreateDocumentDTO, UpdateDocumentDTO


@pytest.mark.asyncio
class TestDocumentService:
    """Test DocumentService."""

    async def test_create_document(self, db_session, test_user, test_workspace):
        """Test creating a document."""
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        dto = CreateDocumentDTO(
            title="New Document",
            description="Test description",
            content={"type": "doc", "content": []},
            workspace_id=test_workspace.id,
            is_public=False,
            owner_id=test_user.id,
        )

        document = await document_service.create_document(dto, test_user.id)

        assert document.title == "New Document"
        assert document.owner_id == test_user.id
        assert document.workspace_id == test_workspace.id
        assert document.is_public is False

    async def test_create_document_without_workspace(self, db_session, test_user):
        """Test creating a document without workspace."""
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        dto = CreateDocumentDTO(
            title="New Document",
            owner_id=test_user.id,
            is_public=False,
        )

        document = await document_service.create_document(dto, test_user.id)

        assert document.title == "New Document"
        assert document.owner_id == test_user.id
        assert document.workspace_id is None

    async def test_get_public_documents(self, db_session, test_user, test_document):
        """Test getting public documents."""
        from app.models.document import Document as DocumentModel

        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        # Create a public document
        public_doc = DocumentModel(
            id=uuid.uuid4(),
            title="Public Doc",
            owner_id=test_user.id,
            is_public=True,
        )
        db_session.add(public_doc)
        await db_session.commit()

        public_documents = await document_service.get_public_documents()

        assert len(public_documents) >= 1
        assert any(doc.id == public_doc.id for doc in public_documents)
        assert all(doc.is_public for doc in public_documents)

    async def test_get_document_public_access(
        self, db_session, test_user, test_document
    ):
        """Test getting a public document by non-owner."""
        from app.models.user import User as UserModel
        from app.models.document import Document as DocumentModel
        from app.core.security import get_password_hash

        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        # Make document public
        test_document.is_public = True
        await db_session.commit()

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        # Other user should be able to access public document
        document = await document_service.get_document(test_document.id, other_user.id)

        assert document.id == test_document.id
        assert document.is_public is True

    async def test_get_document_private_access_denied(
        self, db_session, test_user, test_document
    ):
        """Test getting a private document by non-owner is denied."""
        from app.models.user import User as UserModel
        from app.core.security import get_password_hash

        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        # Document is private, other user should not access it
        with pytest.raises(HTTPException) as exc_info:
            await document_service.get_document(test_document.id, other_user.id)

        assert exc_info.value.status_code == 403

    async def test_update_document_is_public(
        self, db_session, test_user, test_document
    ):
        """Test updating document is_public field."""
        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        dto = UpdateDocumentDTO(is_public=True)

        updated = await document_service.update_document(
            test_document.id, dto, test_user.id
        )

        assert updated.is_public is True

    async def test_update_document_by_non_owner(
        self, db_session, test_user, test_document
    ):
        """Test updating document by non-owner is denied."""
        from app.models.user import User as UserModel
        from app.core.security import get_password_hash

        document_repository = DocumentRepository(db_session)
        workspace_repository = WorkspaceRepository(db_session)
        document_service = DocumentService(document_repository, workspace_repository)

        # Create another user
        other_user = UserModel(
            id=uuid.uuid4(),
            email="other@example.com",
            username="otheruser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        dto = UpdateDocumentDTO(title="Hacked Title")

        with pytest.raises(HTTPException) as exc_info:
            await document_service.update_document(test_document.id, dto, other_user.id)

        assert exc_info.value.status_code == 403
