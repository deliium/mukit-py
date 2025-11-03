"""Comment service."""

import uuid

from fastapi import HTTPException

from app.repositories.comment_repository import CommentRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.dto import (
    CommentReadModel,
    CommentThreadReadModel,
)
from app.services.dto import (
    CreateCommentDTO,
    CreateCommentThreadDTO,
    UpdateCommentDTO,
    UpdateCommentThreadDTO,
)


class CommentService:
    """Service for comment business logic."""

    def __init__(
        self,
        comment_repository: CommentRepository,
        document_repository: DocumentRepository,
        workspace_repository: WorkspaceRepository,
    ):
        """Initialize service with repositories."""
        self.comment_repository = comment_repository
        self.document_repository = document_repository
        self.workspace_repository = workspace_repository

    async def create_thread(
        self, dto: CreateCommentThreadDTO, current_user_id: uuid.UUID
    ) -> CommentThreadReadModel:
        """Create a new comment thread."""
        # Verify document exists and user has access
        document = await self.document_repository.get_by_id(dto.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access: public document or user is owner or workspace member
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return await self.comment_repository.create_thread(
            document_id=dto.document_id,
            block_id=dto.block_id,
            position=dto.position,
        )

    async def get_thread(
        self, thread_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> CommentThreadReadModel:
        """Get comment thread by ID."""
        thread = await self.comment_repository.get_thread_by_id(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        # Verify document access
        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return thread

    async def get_threads_by_document(
        self, document_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> list[CommentThreadReadModel]:
        """Get all comment threads for a document."""
        # Verify document exists and user has access
        document = await self.document_repository.get_by_id(document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return await self.comment_repository.get_threads_by_document(document_id)

    async def update_thread(
        self,
        thread_id: uuid.UUID,
        dto: UpdateCommentThreadDTO,
        current_user_id: uuid.UUID,
    ) -> CommentThreadReadModel:
        """Update comment thread."""
        thread = await self.comment_repository.get_thread_by_id(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        # Verify document access
        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access: user must have access to document
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        updated_thread = await self.comment_repository.update_thread(
            thread_id, is_resolved=dto.is_resolved
        )
        if not updated_thread:
            raise HTTPException(
                status_code=500, detail="Failed to update comment thread"
            )

        return updated_thread

    async def delete_thread(
        self, thread_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> bool:
        """Delete comment thread."""
        thread = await self.comment_repository.get_thread_by_id(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        # Verify document access
        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access: user must have access to document
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return await self.comment_repository.delete_thread(thread_id)

    async def create_comment(
        self, dto: CreateCommentDTO, current_user_id: uuid.UUID
    ) -> CommentReadModel:
        """Create a new comment."""
        # Verify thread exists
        thread = await self.comment_repository.get_thread_by_id(dto.thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        # Verify document access
        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        # If parent_id is provided, verify parent comment exists
        if dto.parent_id:
            parent = await self.comment_repository.get_comment_by_id(dto.parent_id)
            if not parent:
                raise HTTPException(status_code=404, detail="Parent comment not found")
            if parent.thread_id != dto.thread_id:
                raise HTTPException(
                    status_code=400,
                    detail="Parent comment must be in the same thread",
                )

        return await self.comment_repository.create_comment(
            thread_id=dto.thread_id,
            author_id=current_user_id,
            content=dto.content,
            parent_id=dto.parent_id,
        )

    async def get_comment(
        self, comment_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> CommentReadModel:
        """Get comment by ID."""
        comment = await self.comment_repository.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Verify document access
        thread = await self.comment_repository.get_thread_by_id(comment.thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return comment

    async def get_comments_by_thread(
        self, thread_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> list[CommentReadModel]:
        """Get all comments in a thread."""
        thread = await self.comment_repository.get_thread_by_id(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Comment thread not found")

        # Verify document access
        document = await self.document_repository.get_by_id(thread.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Check access
        has_access = document.is_public or document.owner_id == current_user_id
        if not has_access and document.workspace_id:
            member = await self.workspace_repository.get_member(
                document.workspace_id, current_user_id
            )
            has_access = member is not None

        if not has_access:
            raise HTTPException(
                status_code=403, detail="You don't have access to this document"
            )

        return await self.comment_repository.get_comments_by_thread(thread_id)

    async def update_comment(
        self,
        comment_id: uuid.UUID,
        dto: UpdateCommentDTO,
        current_user_id: uuid.UUID,
    ) -> CommentReadModel:
        """Update comment."""
        comment = await self.comment_repository.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Only the author can edit their comment
        if comment.author_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You can only edit your own comments"
            )

        updated_comment = await self.comment_repository.update_comment(
            comment_id, content=dto.content
        )
        if not updated_comment:
            raise HTTPException(status_code=500, detail="Failed to update comment")

        return updated_comment

    async def delete_comment(
        self, comment_id: uuid.UUID, current_user_id: uuid.UUID
    ) -> bool:
        """Delete comment."""
        comment = await self.comment_repository.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Only the author can delete their comment
        if comment.author_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="You can only delete your own comments"
            )

        return await self.comment_repository.delete_comment(comment_id)
