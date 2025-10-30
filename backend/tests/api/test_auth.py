"""Tests for authentication endpoints."""

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User as UserModel


@pytest.mark.asyncio
async def test_register_user(client: httpx.AsyncClient, db_session: AsyncSession):
    """Test user registration."""
    user_data = {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "newpassword123",
        "first_name": "New",
        "last_name": "User",
    }

    response = await client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["username"] == user_data["username"]
    assert data["first_name"] == user_data["first_name"]
    assert data["last_name"] == user_data["last_name"]
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(
    client: httpx.AsyncClient, test_user: UserModel
):
    """Test registration with duplicate email."""
    user_data = {
        "email": test_user.email,
        "username": "differentuser",
        "password": "password123",
    }

    response = await client.post("/api/v1/auth/register", json=user_data)

    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: httpx.AsyncClient, test_user: UserModel):
    """Test successful login."""
    login_data = {
        "email": test_user.email,
        "password": "testpassword",
    }

    response = await client.post("/api/v1/auth/login", json=login_data)

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(
    client: httpx.AsyncClient, test_user: UserModel
):
    """Test login with invalid credentials."""
    login_data = {
        "email": test_user.email,
        "password": "wrongpassword",
    }

    response = await client.post("/api/v1/auth/login", json=login_data)

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: httpx.AsyncClient):
    """Test login with nonexistent user."""
    login_data = {
        "email": "nonexistent@example.com",
        "password": "password123",
    }

    response = await client.post("/api/v1/auth/login", json=login_data)

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_user(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_user: UserModel
):
    """Test getting current user information."""
    response = await client.get("/api/v1/auth/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["username"] == test_user.username
    assert data["id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: httpx.AsyncClient):
    """Test getting current user without authentication."""
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: httpx.AsyncClient):
    """Test getting current user with invalid token."""
    headers = {"Authorization": "Bearer invalid_token"}
    response = await client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 401
