import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.block import BlockType

__all__ = ["Block", "BlockCreate", "BlockType", "BlockUpdate"]


class BlockBase(BaseModel):
    block_type: BlockType
    content: dict[str, Any]
    position: int
    parent_id: uuid.UUID | None = None
    block_metadata: dict[str, Any] | None = None


class BlockCreate(BlockBase):
    document_id: uuid.UUID


class BlockUpdate(BaseModel):
    content: dict[str, Any] | None = None
    position: int | None = None
    block_metadata: dict[str, Any] | None = None


class BlockInDB(BlockBase):
    id: uuid.UUID
    document_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Block(BlockInDB):
    pass
