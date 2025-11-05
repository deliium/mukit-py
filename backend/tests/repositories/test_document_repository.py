"""Tests for DocumentRepository."""

import uuid

import pytest

from app.repositories.document_repository import DocumentRepository
from app.schemas.dto import DocumentReadModel, DocumentVersionReadModel


@pytest.mark.asyncio
class TestDocumentRepository:
    """Test DocumentRepository."""

    async def test_create_document(self, db_session, test_user):
        """Test creating a document."""
        repository = DocumentRepository(db_session)

        document_read = await repository.create(
            title="New Document",
            owner_id=test_user.id,
            description="Test description",
            content={"type": "doc", "content": []},
            is_public=True,
        )

        assert isinstance(document_read, DocumentReadModel)
        assert document_read.title == "New Document"
        assert document_read.owner_id == test_user.id
        assert document_read.description == "Test description"
        assert document_read.is_public is True
        assert document_read.id is not None

    async def test_get_by_id(self, db_session, test_document):
        """Test getting document by ID."""
        repository = DocumentRepository(db_session)

        document_read = await repository.get_by_id(test_document.id)

        assert document_read is not None
        assert document_read.id == test_document.id
        assert document_read.title == test_document.title

    async def test_get_by_id_nonexistent(self, db_session):
        """Test getting document by nonexistent ID."""
        repository = DocumentRepository(db_session)

        document_read = await repository.get_by_id(uuid.uuid4())

        assert document_read is None

    async def test_get_by_owner(self, db_session, test_user, test_document):
        """Test getting documents by owner."""
        repository = DocumentRepository(db_session)

        documents_read = await repository.get_by_owner(owner_id=test_user.id)

        assert len(documents_read) >= 1
        assert any(doc.id == test_document.id for doc in documents_read)

    async def test_get_by_owner_with_workspace(
        self, db_session, test_user, test_workspace, test_document
    ):
        """Test getting documents by owner filtered by workspace."""
        repository = DocumentRepository(db_session)

        documents_read = await repository.get_by_owner(
            owner_id=test_user.id, workspace_id=test_workspace.id
        )

        assert len(documents_read) >= 1
        assert any(doc.id == test_document.id for doc in documents_read)
        assert all(doc.workspace_id == test_workspace.id for doc in documents_read)

    async def test_update_document(self, db_session, test_document):
        """Test updating a document."""
        repository = DocumentRepository(db_session)

        updated_read = await repository.update(
            document_id=test_document.id,
            title="Updated Title",
            description="Updated description",
            is_public=True,
        )

        assert updated_read is not None
        assert updated_read.title == "Updated Title"
        assert updated_read.description == "Updated description"
        assert updated_read.is_public is True

    async def test_update_document_nonexistent(self, db_session):
        """Test updating a nonexistent document."""
        repository = DocumentRepository(db_session)

        updated_read = await repository.update(
            document_id=uuid.uuid4(), title="New Title"
        )

        assert updated_read is None

    async def test_delete_document(self, db_session, test_document):
        """Test deleting a document."""
        repository = DocumentRepository(db_session)
        document_id = test_document.id

        success = await repository.delete(document_id)

        assert success is True
        # Verify document is deleted
        document_read = await repository.get_by_id(document_id)
        assert document_read is None

    async def test_delete_document_nonexistent(self, db_session):
        """Test deleting a nonexistent document."""
        repository = DocumentRepository(db_session)

        success = await repository.delete(uuid.uuid4())

        assert success is False

    async def test_get_versions(self, db_session, test_document):
        """Test getting document versions."""
        repository = DocumentRepository(db_session)

        versions_read = await repository.get_versions(test_document.id)

        assert isinstance(versions_read, list)
        assert len(versions_read) >= 1
        assert all(isinstance(v, DocumentVersionReadModel) for v in versions_read)

    async def test_get_public_documents(self, db_session, test_user, test_document):
        """Test getting public documents."""
        from app.models.document import Document as DocumentModel

        repository = DocumentRepository(db_session)

        # Create a public document
        public_doc = DocumentModel(
            id=uuid.uuid4(),
            title="Public Doc",
            owner_id=test_user.id,
            is_public=True,
        )
        db_session.add(public_doc)
        await db_session.commit()

        # Get public documents
        public_docs = await repository.get_public_documents()

        assert len(public_docs) >= 1
        assert any(doc.id == public_doc.id for doc in public_docs)
        assert all(doc.is_public for doc in public_docs)
        # Private document should not be in the list
        assert not any(doc.id == test_document.id for doc in public_docs)
