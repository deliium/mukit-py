"""Read model for User entity."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserReadModel(BaseModel):
    """Read model for User entity."""

    id: uuid.UUID
    email: str
    username: str
    hashed_password: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
