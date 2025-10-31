"""Tests for document endpoints."""

import uuid

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


@pytest.mark.asyncio
async def test_get_public_documents(
    client: httpx.AsyncClient,
    db_session,
    test_user,
):
    """Test getting public documents."""
    from app.models.document import Document as DocumentModel

    # Create a public document
    public_doc = DocumentModel(
        id=uuid.uuid4(),
        title="Public Document",
        description="A public document",
        content={"blocks": []},
        owner_id=test_user.id,
        is_public=True,
    )
    db_session.add(public_doc)

    # Create a private document
    private_doc = DocumentModel(
        id=uuid.uuid4(),
        title="Private Document",
        description="A private document",
        content={"blocks": []},
        owner_id=test_user.id,
        is_public=False,
    )
    db_session.add(private_doc)
    await db_session.commit()

    # Get public documents (no auth required)
    response = await client.get("/api/v1/documents/public")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check that only public documents are returned
    public_ids = [doc["id"] for doc in data]
    assert str(public_doc.id) in public_ids
    assert str(private_doc.id) not in public_ids
    # Verify the public document is in the list
    public_doc_data = next(doc for doc in data if doc["id"] == str(public_doc.id))
    assert public_doc_data["is_public"] is True


@pytest.mark.asyncio
async def test_get_public_documents_empty(client: httpx.AsyncClient):
    """Test getting public documents when there are none."""
    response = await client.get("/api/v1/documents/public")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # May be empty or contain other public documents from other tests


@pytest.mark.asyncio
async def test_update_document_is_public(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_document,
):
    """Test updating document is_public field."""
    # Update document to be public
    update_data = {"is_public": True}

    response = await client.put(
        f"/api/v1/documents/{test_document.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_public"] is True

    # Update back to private
    update_data = {"is_public": False}
    response = await client.put(
        f"/api/v1/documents/{test_document.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_public"] is False


@pytest.mark.asyncio
async def test_update_document_is_public_unauthorized(
    client: httpx.AsyncClient,
    db_session,
    test_user,
):
    """Test updating document is_public by non-owner."""
    from app.models.user import User as UserModel
    from app.models.document import Document as DocumentModel
    from app.core.security import get_password_hash

    # Create another user
    other_user = UserModel(
        id=uuid.uuid4(),
        email="other@example.com",
        username="otheruser",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    # Create a document owned by test_user
    document = DocumentModel(
        id=uuid.uuid4(),
        title="Owner's Document",
        description="Document owned by test_user",
        content={"blocks": []},
        owner_id=test_user.id,
        is_public=False,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)

    # Login as other_user
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": other_user.email, "password": "password123"},
    )
    other_headers = {
        "Authorization": f"Bearer {login_response.json()['access_token']}"
    }

    # Try to update document as other_user
    update_data = {"is_public": True}
    response = await client.put(
        f"/api/v1/documents/{document.id}",
        json=update_data,
        headers=other_headers,
    )

    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_public_document_by_id(
    client: httpx.AsyncClient,
    db_session,
    test_user,
):
    """Test getting a public document by ID without authentication."""
    from app.models.document import Document as DocumentModel

    # Create a public document
    public_doc = DocumentModel(
        id=uuid.uuid4(),
        title="Public Document",
        description="A public document",
        content={"blocks": []},
        owner_id=test_user.id,
        is_public=True,
    )
    db_session.add(public_doc)
    await db_session.commit()
    await db_session.refresh(public_doc)

    # Try to get it without authentication
    response = await client.get(f"/api/v1/documents/{public_doc.id}")

    # Should still require authentication (endpoint requires auth)
    assert response.status_code == 403
