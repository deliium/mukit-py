"""Comment endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_active_user
from app.api.deps_services import get_comment_service
from app.models.user import User
from app.schemas.dto import CommentReadModel, CommentThreadReadModel
from app.services.comment_service import CommentService
from app.services.dto import (
    CreateCommentDTO,
    CreateCommentThreadDTO,
    UpdateCommentDTO,
    UpdateCommentThreadDTO,
)

router = APIRouter()


@router.post("/threads", response_model=CommentThreadReadModel)
async def create_thread(
    thread_data: CreateCommentThreadDTO,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentThreadReadModel:
    """Create a new comment thread."""
    return await comment_service.create_thread(thread_data, current_user.id)


@router.get("/threads/{thread_id}", response_model=CommentThreadReadModel)
async def get_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentThreadReadModel:
    """Get comment thread by ID."""
    return await comment_service.get_thread(thread_id, current_user.id)


@router.get(
    "/documents/{document_id}/threads", response_model=list[CommentThreadReadModel]
)
async def get_threads_by_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> list[CommentThreadReadModel]:
    """Get all comment threads for a document."""
    return await comment_service.get_threads_by_document(document_id, current_user.id)


@router.patch("/threads/{thread_id}", response_model=CommentThreadReadModel)
async def update_thread(
    thread_id: uuid.UUID,
    thread_data: UpdateCommentThreadDTO,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentThreadReadModel:
    """Update comment thread."""
    return await comment_service.update_thread(thread_id, thread_data, current_user.id)


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> dict[str, str]:
    """Delete comment thread."""
    success = await comment_service.delete_thread(thread_id, current_user.id)
    if not success:
        return {"message": "Failed to delete thread"}
    return {"message": "Thread deleted successfully"}


@router.post("/", response_model=CommentReadModel)
async def create_comment(
    comment_data: CreateCommentDTO,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentReadModel:
    """Create a new comment."""
    return await comment_service.create_comment(comment_data, current_user.id)


@router.get("/{comment_id}", response_model=CommentReadModel)
async def get_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentReadModel:
    """Get comment by ID."""
    return await comment_service.get_comment(comment_id, current_user.id)


@router.get("/threads/{thread_id}/comments", response_model=list[CommentReadModel])
async def get_comments_by_thread(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> list[CommentReadModel]:
    """Get all comments in a thread."""
    return await comment_service.get_comments_by_thread(thread_id, current_user.id)


@router.patch("/{comment_id}", response_model=CommentReadModel)
async def update_comment(
    comment_id: uuid.UUID,
    comment_data: UpdateCommentDTO,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> CommentReadModel:
    """Update comment."""
    return await comment_service.update_comment(
        comment_id, comment_data, current_user.id
    )


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> dict[str, str]:
    """Delete comment."""
    success = await comment_service.delete_comment(comment_id, current_user.id)
    if not success:
        return {"message": "Failed to delete comment"}
    return {"message": "Comment deleted successfully"}


@router.post("/threads/update-positions")
async def update_comment_positions(
    updates: dict[str, str],  # {"thread_id": "position"}
    current_user: User = Depends(get_current_active_user),
    comment_service: CommentService = Depends(get_comment_service),
) -> dict[str, int]:
    """Update positions for multiple comment threads."""
    updated = 0
    for thread_id_str, position in updates.items():
        try:
            thread_id = uuid.UUID(thread_id_str)
            await comment_service.update_thread(
                thread_id,
                UpdateCommentThreadDTO(position=position),
                current_user.id,
            )
            updated += 1
        except (ValueError, HTTPException):
            continue

    return {"updated": updated}
