import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.document import Document as DocumentModel
from app.models.document import DocumentVersion as DocumentVersionModel
from app.models.user import User
from app.schemas.document import (
    Document,
    DocumentCreate,
    DocumentUpdate,
    DocumentVersion,
)

router = APIRouter()


@router.post("/", response_model=Document)
async def create_document(
    document: DocumentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    db_document = DocumentModel(
        title=document.title,
        description=document.description,
        content=document.content,
        owner_id=current_user.id,
        workspace_id=document.workspace_id,
        is_public=document.is_public,
        settings=document.settings,
    )

    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)

    return db_document  # type: ignore[return-value]


@router.get("/", response_model=list[Document])
async def get_documents(
    workspace_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[Document]:
    query = select(DocumentModel).where(DocumentModel.owner_id == current_user.id)

    if workspace_id:
        query = query.where(DocumentModel.workspace_id == workspace_id)

    result = await db.execute(query)
    return result.scalars().all()  # type: ignore[return-value]


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    result = await db.execute(
        select(DocumentModel).where(DocumentModel.id == document_id),
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check permissions (simplified - in real app, check Permission model)
    if document.owner_id != current_user.id and not document.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    return document  # type: ignore[return-value]


@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: uuid.UUID,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    result = await db.execute(
        select(DocumentModel).where(DocumentModel.id == document_id),
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check permissions
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update document
    for field, value in document_update.model_dump(exclude_unset=True).items():
        setattr(document, field, value)

    await db.commit()
    await db.refresh(document)

    return document  # type: ignore[return-value]


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(
        select(DocumentModel).where(DocumentModel.id == document_id),
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check permissions
    if document.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete document versions first
    from app.models.document import DocumentVersion as DocumentVersionModel

    result = await db.execute(
        select(DocumentVersionModel).where(
            DocumentVersionModel.document_id == document_id
        ),
    )
    versions = result.scalars().all()
    for version in versions:
        await db.delete(version)

    # Delete the document
    await db.delete(document)
    await db.commit()

    return {"message": "Document deleted successfully"}


@router.get("/{document_id}/versions", response_model=list[DocumentVersion])
async def get_document_versions(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentVersion]:
    # Check if user has access to document
    result = await db.execute(
        select(DocumentModel).where(DocumentModel.id == document_id),
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and not document.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(DocumentVersionModel)
        .where(DocumentVersionModel.document_id == document_id)
        .order_by(DocumentVersionModel.version_number.desc()),
    )
    return result.scalars().all()  # type: ignore[return-value]
