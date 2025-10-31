"""Document service."""

import uuid

from fastapi import HTTPException

from app.repositories.document_repository import DocumentRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.document import Document, DocumentVersion
from app.services.dto import CreateDocumentDTO, DocumentFilterDTO, UpdateDocumentDTO


class DocumentService:
    """Service for document business logic."""

    def __init__(
        self,
        document_repository: DocumentRepository,
        workspace_repository: WorkspaceRepository,
    ):
        """Initialize service with repositories."""
        self.document_repository = document_repository
        self.workspace_repository = workspace_repository

    async def create_document(
        self, dto: CreateDocumentDTO, current_user_id: uuid.UUID
    ) -> Document:
        """Create a new document."""
        # Verify workspace access if workspace_id is provided
        if dto.workspace_id:
            workspace = await self.workspace_repository.get_by_id(dto.workspace_id)
            if not workspace:
                raise HTTPException(status_code=404, detail="Workspace not found")

            # Check if user is a member of the workspace
            member = await self.workspace_repository.get_member(
                dto.workspace_id, current_user_id
            )
            if not member:
                raise HTTPException(
                    status_code=403, detail="You are not a member of this workspace"
                )

        document_read = await self.document_repository.create(
            title=dto.title,
            description=dto.description,
            content=dto.content,
            owner_id=dto.owner_id,
            workspace_id=dto.workspace_id,
            is_public=dto.is_public,
            settings=dto.settings,
        )

        return Document(
            id=document_read.id,
            title=document_read.title,
            description=document_read.description,
            content=document_read.content,
            owner_id=document_read.owner_id,
            workspace_id=document_read.workspace_id,
            is_public=document_read.is_public,
            settings=document_read.settings,
            created_at=document_read.created_at,
            updated_at=document_read.updated_at,
        )

    async def get_documents(
        self, filter_dto: DocumentFilterDTO, current_user_id: uuid.UUID
    ) -> list[Document]:
        """Get documents by owner."""
        owner_id = filter_dto.owner_id or current_user_id
        documents_read = await self.document_repository.get_by_owner(
            owner_id=owner_id, workspace_id=filter_dto.workspace_id
        )

        return [
            Document(
                id=doc.id,
                title=doc.title,
                description=doc.description,
                content=doc.content,
                owner_id=doc.owner_id,
                workspace_id=doc.workspace_id,
                is_public=doc.is_public,
                settings=doc.settings,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
            for doc in documents_read
        ]

    async def get_public_documents(self) -> list[Document]:
        """Get all public documents."""
        documents_read = await self.document_repository.get_public_documents()

        return [
            Document(
                id=doc.id,
                title=doc.title,
                description=doc.description,
                content=doc.content,
                owner_id=doc.owner_id,
                workspace_id=doc.workspace_id,
                is_public=doc.is_public,
                settings=doc.settings,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
            for doc in documents_read
        ]

    async def get_document(
        self, document_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> Document:
        """Get document by ID."""
        document_read = await self.document_repository.get_by_id(document_id)

        if not document_read:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check permissions
        if document_read.owner_id != current_user_id and not document_read.is_public:
            # Check if user is a workspace member
            if document_read.workspace_id:
                member = await self.workspace_repository.get_member(
                    document_read.workspace_id, current_user_id
                )
                if not member:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=403, detail="Access denied")

        return Document(
            id=document_read.id,
            title=document_read.title,
            description=document_read.description,
            content=document_read.content,
            owner_id=document_read.owner_id,
            workspace_id=document_read.workspace_id,
            is_public=document_read.is_public,
            settings=document_read.settings,
            created_at=document_read.created_at,
            updated_at=document_read.updated_at,
        )

    async def update_document(
        self,
        document_id: uuid.UUID,
        dto: UpdateDocumentDTO,
        current_user_id: uuid.UUID,
    ) -> Document:
        """Update document."""
        document_read = await self.document_repository.get_by_id(document_id)

        if not document_read:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check permissions
        if document_read.owner_id != current_user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        updated_read = await self.document_repository.update(
            document_id=document_id,
            title=dto.title,
            description=dto.description,
            content=dto.content,
            is_public=dto.is_public,
            settings=dto.settings,
        )

        if not updated_read:
            raise HTTPException(status_code=404, detail="Document not found")

        return Document(
            id=updated_read.id,
            title=updated_read.title,
            description=updated_read.description,
            content=updated_read.content,
            owner_id=updated_read.owner_id,
            workspace_id=updated_read.workspace_id,
            is_public=updated_read.is_public,
            settings=updated_read.settings,
            created_at=updated_read.created_at,
            updated_at=updated_read.updated_at,
        )

    async def delete_document(
        self, document_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> dict[str, str]:
        """Delete document."""
        document_read = await self.document_repository.get_by_id(document_id)

        if not document_read:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check permissions
        if document_read.owner_id != current_user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        success = await self.document_repository.delete(document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {"message": "Document deleted successfully"}

    async def get_document_versions(
        self, document_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> list[DocumentVersion]:
        """Get document versions."""
        # Check if user has access to document
        document_read = await self.document_repository.get_by_id(document_id)

        if not document_read:
            raise HTTPException(status_code=404, detail="Document not found")

        if document_read.owner_id != current_user_id and not document_read.is_public:
            # Check if user is a workspace member
            if document_read.workspace_id:
                member = await self.workspace_repository.get_member(
                    document_read.workspace_id, current_user_id
                )
                if not member:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=403, detail="Access denied")

        versions_read = await self.document_repository.get_versions(document_id)

        return [
            DocumentVersion(
                id=version.id,
                document_id=version.document_id,
                version_number=version.version_number,
                content=version.content,
                content_hash=version.content_hash,
                author_id=version.author_id,
                change_description=version.change_description,
                created_at=version.created_at,
            )
            for version in versions_read
        ]
