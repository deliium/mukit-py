import json

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class ConnectionManager:
    def __init__(self) -> None:
        # Store active connections by document_id
        self.active_connections: dict[str, list[WebSocket]] = {}
        # Store user info for each connection
        self.connection_users: dict[WebSocket, dict[str, str]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        document_id: str,
        user: dict[str, str],
    ) -> None:
        if document_id not in self.active_connections:
            self.active_connections[document_id] = []

        self.active_connections[document_id].append(websocket)
        self.connection_users[websocket] = user

        # Notify other users about new user joining
        await self.broadcast_to_document(
            document_id,
            {
                "type": "user_joined",
                "user": user,
                "message": f"{user['username']} joined the document",
            },
            exclude_websocket=websocket,
        )

    async def disconnect(self, websocket: WebSocket, document_id: str) -> None:
        if document_id in self.active_connections:
            if websocket in self.active_connections[document_id]:
                self.active_connections[document_id].remove(websocket)

            if not self.active_connections[document_id]:
                del self.active_connections[document_id]

        if websocket in self.connection_users:
            user = self.connection_users[websocket]
            del self.connection_users[websocket]

            # Notify other users about user leaving
            await self.broadcast_to_document(
                document_id,
                {
                    "type": "user_left",
                    "user": user,
                    "message": f"{user['username']} left the document",
                },
            )

    async def send_personal_message(
        self,
        message: dict[str, str | dict[str, str] | list[dict[str, str]]],
        websocket: WebSocket,
    ) -> None:
        try:
            await websocket.send_text(json.dumps(message))
        except WebSocketDisconnect:
            # Client disconnected; cleanup
            for doc_id, conns in list(self.active_connections.items()):
                if websocket in conns:
                    conns.remove(websocket)
                    if not conns:
                        del self.active_connections[doc_id]
            if websocket in self.connection_users:
                del self.connection_users[websocket]

    async def broadcast_to_document(
        self,
        document_id: str,
        message: dict[str, str | dict[str, str] | list[dict[str, str]]],
        exclude_websocket: WebSocket | None = None,
    ) -> None:
        if document_id in self.active_connections:
            for connection in self.active_connections[document_id]:
                if connection != exclude_websocket:
                    try:
                        await connection.send_text(json.dumps(message))
                    except WebSocketDisconnect:
                        # Remove broken connections
                        if connection in self.active_connections[document_id]:
                            self.active_connections[document_id].remove(connection)

    def get_document_users(self, document_id: str) -> list[dict[str, str]]:
        if document_id not in self.active_connections:
            return []

        return [
            self.connection_users[connection]
            for connection in self.active_connections[document_id]
            if connection in self.connection_users
        ]


manager = ConnectionManager()
