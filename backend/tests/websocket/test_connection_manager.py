"""Tests for WebSocket connection manager."""

import json
from unittest.mock import AsyncMock

import pytest

from app.websocket.connection_manager import ConnectionManager


class TestConnectionManager:
    """Test WebSocket connection manager."""

    def setup_method(self):
        """Set up test fixtures."""
        self.manager = ConnectionManager()

    def test_initialization(self):
        """Test connection manager initialization."""
        assert self.manager.active_connections == {}
        assert self.manager.connection_users == {}

    @pytest.mark.asyncio
    async def test_connect(self):
        """Test connecting a WebSocket."""
        websocket = AsyncMock()
        document_id = "test-doc-123"
        user = {"id": "user-123", "username": "testuser", "email": "test@example.com"}

        await self.manager.connect(websocket, document_id, user)

        # Check that connection was added
        assert document_id in self.manager.active_connections
        assert websocket in self.manager.active_connections[document_id]
        assert websocket in self.manager.connection_users
        assert self.manager.connection_users[websocket] == user

        # Note: websocket.accept() is called in document_websocket.py, not here

    @pytest.mark.asyncio
    async def test_disconnect(self):
        """Test disconnecting a WebSocket."""
        websocket = AsyncMock()
        document_id = "test-doc-123"
        user = {"id": "user-123", "username": "testuser", "email": "test@example.com"}

        # Connect first
        await self.manager.connect(websocket, document_id, user)

        # Then disconnect
        await self.manager.disconnect(websocket, document_id)

        # Check that connection was removed
        assert document_id not in self.manager.active_connections
        assert websocket not in self.manager.connection_users

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_connection(self):
        """Test disconnecting a non-existent connection."""
        websocket = AsyncMock()
        document_id = "test-doc-123"

        # Try to disconnect without connecting first
        await self.manager.disconnect(websocket, document_id)

        # Should not raise an error
        assert document_id not in self.manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal_message(self):
        """Test sending a personal message."""
        websocket = AsyncMock()
        document_id = "test-doc-123"
        user = {"id": "user-123", "username": "testuser", "email": "test@example.com"}

        # Connect first
        await self.manager.connect(websocket, document_id, user)

        # Send message
        message = {"type": "test", "content": "Hello World"}
        await self.manager.send_personal_message(message, websocket)

        # Check that websocket.send_text was called
        websocket.send_text.assert_called_once()
        sent_data = websocket.send_text.call_args[0][0]
        assert json.loads(sent_data) == message

    @pytest.mark.asyncio
    async def test_broadcast_to_document(self):
        """Test broadcasting to all connections in a document."""
        websocket1 = AsyncMock()
        websocket2 = AsyncMock()
        document_id = "test-doc-123"
        user1 = {"id": "user-1", "username": "user1", "email": "user1@example.com"}
        user2 = {"id": "user-2", "username": "user2", "email": "user2@example.com"}

        # Connect two WebSockets
        await self.manager.connect(websocket1, document_id, user1)
        await self.manager.connect(websocket2, document_id, user2)

        # Broadcast message
        message = {"type": "broadcast", "content": "Hello Everyone"}
        await self.manager.broadcast_to_document(document_id, message)

        # Check that both WebSockets received the message
        # Note: when websocket2 connects, it sends "user_joined" to websocket1
        # So websocket1 gets: user_joined (from websocket2) + broadcast = 2 calls
        # websocket2 gets: only broadcast = 1 call
        assert websocket1.send_text.call_count == 2  # user_joined + broadcast
        assert websocket2.send_text.call_count == 1  # only broadcast

    @pytest.mark.asyncio
    async def test_broadcast_to_document_with_exclude(self):
        """Test broadcasting with excluded WebSocket."""
        websocket1 = AsyncMock()
        websocket2 = AsyncMock()
        document_id = "test-doc-123"
        user1 = {"id": "user-1", "username": "user1", "email": "user1@example.com"}
        user2 = {"id": "user-2", "username": "user2", "email": "user2@example.com"}

        # Connect two WebSockets
        await self.manager.connect(websocket1, document_id, user1)
        await self.manager.connect(websocket2, document_id, user2)

        # Broadcast message excluding websocket1
        message = {"type": "broadcast", "content": "Hello Everyone"}
        await self.manager.broadcast_to_document(
            document_id, message, exclude_websocket=websocket1
        )

        # Check that only websocket2 received the message
        # Note: when websocket2 connects, it sends "user_joined" to websocket1
        # So websocket1 gets: user_joined (from websocket2) = 1 call
        # websocket2 gets: only broadcast = 1 call
        assert websocket1.send_text.call_count == 1  # only user_joined
        assert websocket2.send_text.call_count == 1  # only broadcast

    def test_get_document_users(self):
        """Test getting users in a document."""
        websocket1 = AsyncMock()
        websocket2 = AsyncMock()
        document_id = "test-doc-123"
        user1 = {"id": "user-1", "username": "user1", "email": "user1@example.com"}
        user2 = {"id": "user-2", "username": "user2", "email": "user2@example.com"}

        # Manually add connections (bypassing connect method)
        self.manager.active_connections[document_id] = [websocket1, websocket2]
        self.manager.connection_users[websocket1] = user1
        self.manager.connection_users[websocket2] = user2

        # Get users
        users = self.manager.get_document_users(document_id)

        # Check that both users are returned
        assert len(users) == 2
        assert user1 in users
        assert user2 in users

    def test_get_document_users_empty(self):
        """Test getting users from empty document."""
        document_id = "empty-doc-123"
        users = self.manager.get_document_users(document_id)
        assert users == []

    @pytest.mark.asyncio
    async def test_broadcast_to_nonexistent_document(self):
        """Test broadcasting to non-existent document."""
        document_id = "nonexistent-doc-123"
        message = {"type": "broadcast", "content": "Hello"}

        # Should not raise an error
        await self.manager.broadcast_to_document(document_id, message)

        # No WebSockets should be called
        # (This is tested implicitly by not raising an error)
