from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentThreadBase(BaseModel):
    position: str | None = None


class CommentThreadCreate(CommentThreadBase):
    document_id: int
    block_id: int | None = None


class CommentThreadUpdate(BaseModel):
    is_resolved: bool | None = None


class CommentThreadInDB(CommentThreadBase):
    id: int
    document_id: int
    block_id: int | None = None
    is_resolved: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CommentThread(CommentThreadInDB):
    comments: list["Comment"] = []


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    thread_id: int
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    content: str | None = None


class CommentInDB(CommentBase):
    id: int
    thread_id: int
    author_id: int
    parent_id: int | None = None
    is_edited: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Comment(CommentInDB):
    replies: list["Comment"] = []


# Update forward references
CommentThread.model_rebuild()
Comment.model_rebuild()
