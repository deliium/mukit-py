import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.api.deps_services import get_document_service
from app.models.user import User
from app.schemas.document import (
    Document,
    DocumentCreate,
    DocumentUpdate,
    DocumentVersion,
)
from app.services.document_service import DocumentService
from app.services.dto import CreateDocumentDTO, DocumentFilterDTO, UpdateDocumentDTO

router = APIRouter()


@router.post("/", response_model=Document)
async def create_document(
    document: DocumentCreate,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> Document:
    """Create a new document."""
    dto = CreateDocumentDTO(
        title=document.title,
        description=document.description,
        content=document.content,
        workspace_id=document.workspace_id,
        is_public=document.is_public,
        settings=document.settings,
        owner_id=current_user.id,
    )
    return await document_service.create_document(dto, current_user.id)


@router.get("/", response_model=list[Document])
async def get_documents(
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> list[Document]:
    """Get documents."""
    filter_dto = DocumentFilterDTO(workspace_id=workspace_id, owner_id=current_user.id)
    return await document_service.get_documents(filter_dto, current_user.id)


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> Document:
    """Get document by ID."""
    return await document_service.get_document(document_id, current_user.id)


@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: uuid.UUID,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> Document:
    """Update document."""
    dto = UpdateDocumentDTO(
        title=document_update.title,
        description=document_update.description,
        content=document_update.content,
        is_public=document_update.is_public,
        settings=document_update.settings,
    )
    return await document_service.update_document(document_id, dto, current_user.id)


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> dict[str, str]:
    """Delete document."""
    return await document_service.delete_document(document_id, current_user.id)


@router.get("/{document_id}/versions", response_model=list[DocumentVersion])
async def get_document_versions(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    document_service: DocumentService = Depends(get_document_service),
) -> list[DocumentVersion]:
    """Get document versions."""
    return await document_service.get_document_versions(document_id, current_user.id)
