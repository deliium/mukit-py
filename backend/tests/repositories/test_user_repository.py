"""Tests for UserRepository."""

import uuid

import pytest

from app.repositories.user_repository import UserRepository
from app.schemas.dto import UserReadModel


@pytest.mark.asyncio
class TestUserRepository:
    """Test UserRepository."""

    async def test_create_user(self, db_session):
        """Test creating a user."""
        repository = UserRepository(db_session)

        user_read = await repository.create(
            email="new@example.com",
            username="newuser",
            hashed_password="hashed_password",
            first_name="New",
            last_name="User",
            bio="Test bio",
        )

        assert isinstance(user_read, UserReadModel)
        assert user_read.email == "new@example.com"
        assert user_read.username == "newuser"
        assert user_read.first_name == "New"
        assert user_read.last_name == "User"
        assert user_read.bio == "Test bio"
        assert user_read.hashed_password == "hashed_password"
        assert user_read.id is not None

    async def test_get_by_email(self, db_session, test_user):
        """Test getting user by email."""
        repository = UserRepository(db_session)

        user_read = await repository.get_by_email(test_user.email)

        assert user_read is not None
        assert user_read.email == test_user.email
        assert user_read.id == test_user.id

    async def test_get_by_email_nonexistent(self, db_session):
        """Test getting user by nonexistent email."""
        repository = UserRepository(db_session)

        user_read = await repository.get_by_email("nonexistent@example.com")

        assert user_read is None

    async def test_get_by_id(self, db_session, test_user):
        """Test getting user by ID."""
        repository = UserRepository(db_session)

        user_read = await repository.get_by_id(test_user.id)

        assert user_read is not None
        assert user_read.id == test_user.id
        assert user_read.email == test_user.email

    async def test_get_by_id_nonexistent(self, db_session):
        """Test getting user by nonexistent ID."""
        repository = UserRepository(db_session)

        user_read = await repository.get_by_id(uuid.uuid4())

        assert user_read is None

    async def test_get_by_username(self, db_session, test_user):
        """Test getting user by username."""
        repository = UserRepository(db_session)

        user_read = await repository.get_by_username(test_user.username)

        assert user_read is not None
        assert user_read.username == test_user.username
        assert user_read.id == test_user.id

    async def test_exists_by_email(self, db_session, test_user):
        """Test checking if user exists by email."""
        repository = UserRepository(db_session)

        assert await repository.exists_by_email(test_user.email) is True
        assert await repository.exists_by_email("nonexistent@example.com") is False

    async def test_exists_by_username(self, db_session, test_user):
        """Test checking if user exists by username."""
        repository = UserRepository(db_session)

        assert await repository.exists_by_username(test_user.username) is True
        assert await repository.exists_by_username("nonexistentuser") is False


