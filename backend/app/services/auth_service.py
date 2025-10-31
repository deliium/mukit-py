"""Authentication service."""

from fastapi import HTTPException, status

from app.core.security import create_access_token, get_password_hash, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.dto import UserReadModel
from app.schemas.user import Token, UserPublic


class AuthService:
    """Service for authentication business logic."""

    def __init__(self, user_repository: UserRepository):
        """Initialize service with user repository."""
        self.user_repository = user_repository

    async def register(
        self,
        email: str,
        password: str,
        username: str,
        first_name: str | None = None,
        last_name: str | None = None,
        bio: str | None = None,
    ) -> UserPublic:
        """Register a new user."""
        # Check if user already exists
        if await self.user_repository.exists_by_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username is already taken
        if await self.user_repository.exists_by_username(username):
            raise HTTPException(status_code=400, detail="Username already taken")

        # Create new user
        hashed_password = get_password_hash(password)
        user_read = await self.user_repository.create(
            email=email,
            username=username,
            hashed_password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            bio=bio,
        )

        # Convert to UserPublic (exclude hashed_password)
        return UserPublic(
            id=user_read.id,
            email=user_read.email,
            username=user_read.username,
            first_name=user_read.first_name,
            last_name=user_read.last_name,
            avatar_url=user_read.avatar_url,
            bio=user_read.bio,
            is_active=user_read.is_active,
            is_verified=user_read.is_verified,
            created_at=user_read.created_at,
            updated_at=user_read.updated_at,
        )

    async def login(self, email: str, password: str) -> Token:
        """Login user and return access token."""
        user_read = await self.user_repository.get_by_email(email)

        if not user_read or not verify_password(password, user_read.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(data={"sub": str(user_read.email)})
        return Token(access_token=access_token, token_type="bearer")  # nosec B106

    async def get_current_user(self, email: str) -> UserReadModel:
        """Get current user by email."""
        user_read = await self.user_repository.get_by_email(email)
        if not user_read:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_read
