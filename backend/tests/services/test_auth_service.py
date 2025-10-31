"""Tests for AuthService."""

import pytest
from fastapi import HTTPException

from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.schemas.user import UserPublic


@pytest.mark.asyncio
class TestAuthService:
    """Test AuthService."""

    async def test_register_user(self, db_session):
        """Test registering a new user."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        user_public = await auth_service.register(
            email="new@example.com",
            password="password123",
            username="newuser",
            first_name="New",
            last_name="User",
        )

        assert isinstance(user_public, UserPublic)
        assert user_public.email == "new@example.com"
        assert user_public.username == "newuser"
        assert user_public.first_name == "New"
        assert user_public.last_name == "User"
        assert "hashed_password" not in user_public.model_dump()

    async def test_register_duplicate_email(self, db_session, test_user):
        """Test registering with duplicate email."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register(
                email=test_user.email,
                password="password123",
                username="differentuser",
            )

        assert exc_info.value.status_code == 400
        assert "Email already registered" in str(exc_info.value.detail)

    async def test_register_duplicate_username(self, db_session, test_user):
        """Test registering with duplicate username."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register(
                email="different@example.com",
                password="password123",
                username=test_user.username,
            )

        assert exc_info.value.status_code == 400
        assert "Username already taken" in str(exc_info.value.detail)

    async def test_login_success(self, db_session, test_user):
        """Test successful login."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        from app.core.security import verify_password

        result = await auth_service.login(
            email=test_user.email, password="testpassword"
        )

        assert hasattr(result, "access_token")
        assert result.access_token is not None
        assert result.token_type == "bearer"

    async def test_login_invalid_password(self, db_session, test_user):
        """Test login with invalid password."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(
                email=test_user.email, password="wrongpassword"
            )

        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)

    async def test_login_nonexistent_user(self, db_session):
        """Test login with nonexistent user."""
        user_repository = UserRepository(db_session)
        auth_service = AuthService(user_repository)

        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login(
                email="nonexistent@example.com", password="password123"
            )

        assert exc_info.value.status_code == 401
        assert "Incorrect email or password" in str(exc_info.value.detail)

