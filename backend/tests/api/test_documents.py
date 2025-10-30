"""Tests for document endpoints."""

import httpx
import pytest


@pytest.mark.asyncio
async def test_create_document(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_workspace
):
    """Test creating a document."""
    document_data = {
        "title": "New Document",
        "description": "A new test document",
        "content": {"blocks": []},
        "workspace_id": str(test_workspace.id),
        "is_public": False,
    }

    response = await client.post(
        "/api/v1/documents/",
        json=document_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == document_data["title"]
    assert data["description"] == document_data["description"]
    assert data["workspace_id"] == document_data["workspace_id"]
    assert data["is_public"] == document_data["is_public"]
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_documents(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test getting documents."""
    response = await client.get("/api/v1/documents/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(doc["id"] == str(test_document.id) for doc in data)


@pytest.mark.asyncio
async def test_get_document(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test getting a specific document."""
    response = await client.get(
        f"/api/v1/documents/{test_document.id}", headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_document.id)
    assert data["title"] == test_document.title


@pytest.mark.asyncio
async def test_update_document(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test updating a document."""
    update_data = {
        "title": "Updated Document",
        "description": "Updated description",
    }

    response = await client.put(
        f"/api/v1/documents/{test_document.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["description"] == update_data["description"]


@pytest.mark.asyncio
async def test_delete_document(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test deleting a document."""
    response = await client.delete(
        f"/api/v1/documents/{test_document.id}", headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Document deleted successfully"


@pytest.mark.asyncio
async def test_get_document_versions(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test getting document versions."""
    response = await client.get(
        f"/api/v1/documents/{test_document.id}/versions", headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_document_unauthorized(client: httpx.AsyncClient, test_document):
    """Test getting a document without authentication."""
    response = await client.get(f"/api/v1/documents/{test_document.id}")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_document_unauthorized(client: httpx.AsyncClient, test_workspace):
    """Test creating a document without authentication."""
    document_data = {
        "title": "New Document",
        "description": "A new test document",
        "content": {"blocks": []},
        "workspace_id": str(test_workspace.id),
        "is_public": False,
    }

    response = await client.post("/api/v1/documents/", json=document_data)

    assert response.status_code == 403
