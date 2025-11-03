"""Tests for comment endpoints."""

import uuid

import httpx
import pytest


@pytest.mark.asyncio
async def test_create_thread(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_document
):
    """Test creating a comment thread."""
    thread_data = {
        "document_id": str(test_document.id),
        "position": "pos:10",
    }

    response = await client.post(
        "/api/v1/comments/threads",
        json=thread_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == str(test_document.id)
    assert data["position"] == thread_data["position"]
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_thread(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment_thread
):
    """Test getting a comment thread."""
    response = await client.get(
        f"/api/v1/comments/threads/{test_comment_thread.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_comment_thread.id)
    assert data["document_id"] == str(test_comment_thread.document_id)


@pytest.mark.asyncio
async def test_get_threads_by_document(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_document,
    test_comment_thread,
):
    """Test getting all threads for a document."""
    response = await client.get(
        f"/api/v1/comments/documents/{test_document.id}/threads",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(thread["id"] == str(test_comment_thread.id) for thread in data)


@pytest.mark.asyncio
async def test_update_thread(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment_thread
):
    """Test updating a comment thread."""
    update_data = {"is_resolved": True}

    response = await client.patch(
        f"/api/v1/comments/threads/{test_comment_thread.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_resolved"] is True


@pytest.mark.asyncio
async def test_delete_thread(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment_thread
):
    """Test deleting a comment thread."""
    response = await client.delete(
        f"/api/v1/comments/threads/{test_comment_thread.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data

    # Verify thread is deleted
    get_response = await client.get(
        f"/api/v1/comments/threads/{test_comment_thread.id}",
        headers=auth_headers,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_comment(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment_thread
):
    """Test creating a comment."""
    comment_data = {
        "thread_id": str(test_comment_thread.id),
        "content": "This is a test comment",
    }

    response = await client.post(
        "/api/v1/comments/",
        json=comment_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["thread_id"] == str(test_comment_thread.id)
    assert data["content"] == comment_data["content"]
    assert "id" in data
    assert "author_id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_comment(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment
):
    """Test getting a comment."""
    response = await client.get(
        f"/api/v1/comments/{test_comment.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_comment.id)
    assert data["content"] == test_comment.content


@pytest.mark.asyncio
async def test_get_comments_by_thread(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_comment_thread,
    test_comment,
):
    """Test getting all comments in a thread."""
    response = await client.get(
        f"/api/v1/comments/threads/{test_comment_thread.id}/comments",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(comment["id"] == str(test_comment.id) for comment in data)


@pytest.mark.asyncio
async def test_update_comment(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment
):
    """Test updating a comment."""
    update_data = {"content": "Updated comment content"}

    response = await client.patch(
        f"/api/v1/comments/{test_comment.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["content"] == update_data["content"]
    assert data["is_edited"] is True


@pytest.mark.asyncio
async def test_delete_comment(
    client: httpx.AsyncClient, auth_headers: dict[str, str], test_comment
):
    """Test deleting a comment."""
    response = await client.delete(
        f"/api/v1/comments/{test_comment.id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data

    # Verify comment is deleted
    get_response = await client.get(
        f"/api/v1/comments/{test_comment.id}",
        headers=auth_headers,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_reply(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_comment_thread,
    test_comment,
):
    """Test creating a reply to a comment."""
    reply_data = {
        "thread_id": str(test_comment_thread.id),
        "parent_id": str(test_comment.id),
        "content": "This is a reply",
    }

    response = await client.post(
        "/api/v1/comments/",
        json=reply_data,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["parent_id"] == str(test_comment.id)
    assert data["content"] == reply_data["content"]


@pytest.mark.asyncio
async def test_create_thread_without_access(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_document_private,
):
    """Test creating a thread on a document without access."""
    thread_data = {
        "document_id": str(test_document_private.id),
        "position": "pos:10",
    }

    response = await client.post(
        "/api/v1/comments/threads",
        json=thread_data,
        headers=auth_headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_comment_by_non_owner(
    client: httpx.AsyncClient,
    auth_headers: dict[str, str],
    test_comment_other_user,
):
    """Test updating a comment by non-owner."""
    update_data = {"content": "Unauthorized update"}

    response = await client.patch(
        f"/api/v1/comments/{test_comment_other_user.id}",
        json=update_data,
        headers=auth_headers,
    )

    assert response.status_code == 403

