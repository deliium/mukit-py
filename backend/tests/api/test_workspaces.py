"""Tests for workspace endpoints."""

import httpx
import pytest


@pytest.mark.asyncio
async def test_create_workspace(
    client: httpx.AsyncClient, auth_headers: dict[str, str]
):
    """Test creating a workspace."""
    workspace_data = {
        "name": "New Workspace",
        "description": "A new test workspace",
        "slug": "new-workspace",
    }

    response = await client.post(
        "/api/v1/workspaces/",
        json=workspace_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == workspace_data["name"]
    assert data["description"] == workspace_data["description"]
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_workspaces(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_workspace
):
    """Test getting workspaces."""
    response = await client.get("/api/v1/workspaces/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(ws["id"] == str(test_workspace.id) for ws in data)


@pytest.mark.asyncio
async def test_get_workspace(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_workspace
):
    """Test getting a specific workspace."""
    response = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}", headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_workspace.id)
    assert data["name"] == test_workspace.name


@pytest.mark.asyncio
async def test_update_workspace(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_workspace
):
    """Test updating a workspace."""
    update_data = {
        "name": "Updated Workspace",
        "description": "Updated description",
    }

    response = await client.put(
        f"/api/v1/workspaces/{test_workspace.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["description"] == update_data["description"]


@pytest.mark.asyncio
async def test_get_workspace_unauthorized(client: httpx.AsyncClient, test_workspace):
    """Test getting a workspace without authentication."""
    response = await client.get(f"/api/v1/workspaces/{test_workspace.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_workspace_unauthorized(client: httpx.AsyncClient):
    """Test creating a workspace without authentication."""
    workspace_data = {
        "name": "New Workspace",
        "description": "A new test workspace",
        "slug": "new-workspace",
    }

    response = await client.post("/api/v1/workspaces/", json=workspace_data)

    assert response.status_code == 403
