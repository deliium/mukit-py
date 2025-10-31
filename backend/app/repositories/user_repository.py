"""User repository for database access."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.dto import UserReadModel


class UserRepository:
    """Repository for User entity."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_by_email(self, email: str) -> UserReadModel | None:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        return user.to_read_model() if user else None

    async def get_by_id(self, user_id: uuid.UUID) -> UserReadModel | None:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user.to_read_model() if user else None

    async def get_by_username(self, username: str) -> UserReadModel | None:
        """Get user by username."""
        result = await self.db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        return user.to_read_model() if user else None

    async def create(
        self,
        email: str,
        username: str,
        hashed_password: str,
        first_name: str | None = None,
        last_name: str | None = None,
        bio: str | None = None,
    ) -> UserReadModel:
        """Create a new user."""
        db_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            bio=bio,
        )
        self.db.add(db_user)
        await self.db.commit()
        await self.db.refresh(db_user)
        return db_user.to_read_model()

    async def exists_by_email(self, email: str) -> bool:
        """Check if user exists by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none() is not None

    async def exists_by_username(self, username: str) -> bool:
        """Check if user exists by username."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none() is not None
