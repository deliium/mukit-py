"""Document repository for database access."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentVersion
from app.schemas.dto import DocumentReadModel, DocumentVersionReadModel


class DocumentRepository:
    """Repository for Document entity."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        title: str,
        owner_id: uuid.UUID,
        description: str | None = None,
        content: dict[str, Any] | None = None,
        workspace_id: uuid.UUID | None = None,
        is_public: bool = False,
        settings: dict[str, Any] | None = None,
    ) -> DocumentReadModel:
        """Create a new document."""
        db_document = Document(
            title=title,
            description=description,
            content=content,
            owner_id=owner_id,
            workspace_id=workspace_id,
            is_public=is_public,
            settings=settings,
        )
        self.db.add(db_document)
        await self.db.commit()
        await self.db.refresh(db_document)
        return db_document.to_read_model()

    async def get_by_id(self, document_id: uuid.UUID) -> DocumentReadModel | None:
        """Get document by ID."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        return document.to_read_model() if document else None

    async def get_by_owner(
        self,
        owner_id: uuid.UUID,
        workspace_id: uuid.UUID | None = None,
    ) -> list[DocumentReadModel]:
        """Get documents by owner ID."""
        query = select(Document).where(Document.owner_id == owner_id)
        if workspace_id:
            query = query.where(Document.workspace_id == workspace_id)
        result = await self.db.execute(query)
        documents = result.scalars().all()
        return [doc.to_read_model() for doc in documents]

    async def update(
        self,
        document_id: uuid.UUID,
        title: str | None = None,
        description: str | None = None,
        content: dict[str, Any] | None = None,
        is_public: bool | None = None,
        settings: dict[str, Any] | None = None,
    ) -> DocumentReadModel | None:
        """Update document."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        if not document:
            return None

        if title is not None:
            document.title = title
        if description is not None:
            document.description = description
        if content is not None:
            document.content = content
        if is_public is not None:
            document.is_public = is_public
        if settings is not None:
            document.settings = settings

        await self.db.commit()
        await self.db.refresh(document)
        return document.to_read_model()

    async def delete(self, document_id: uuid.UUID) -> bool:
        """Delete document and its versions."""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        if not document:
            return False

        # Delete document versions first
        versions_result = await self.db.execute(
            select(DocumentVersion).where(DocumentVersion.document_id == document_id)
        )
        versions = versions_result.scalars().all()
        for version in versions:
            await self.db.delete(version)

        # Delete the document
        await self.db.delete(document)
        await self.db.commit()
        return True

    async def get_versions(
        self, document_id: uuid.UUID
    ) -> list[DocumentVersionReadModel]:
        """Get document versions."""
        result = await self.db.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
        )
        versions = result.scalars().all()
        return [version.to_read_model() for version in versions]
