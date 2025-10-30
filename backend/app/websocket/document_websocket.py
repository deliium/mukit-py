import json
import logging
import uuid

from fastapi import WebSocket, status
from sqlalchemy import select

from app.models.document import Document as DocumentModel
from app.models.user import User
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)


async def websocket_endpoint(
    websocket: WebSocket,
    document_id: uuid.UUID,
    token: str,
) -> None:
    logger.info(
        "WebSocket connection attempt: document_id=%s, token=%s...",
        document_id,
        token[:20],
    )

    # Verify user authentication
    try:
        from app.core.database import get_db
        from app.core.security import verify_token

        email = verify_token(token)
        logger.info("Token verification result: email=%s", email)
        if not email:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Get database session
        async for db in get_db():
            # Get user from database
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            logger.info("User lookup result: %s", user)
            if not user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            # Check if document exists and user has access
            doc_result = await db.execute(
                select(DocumentModel).where(DocumentModel.id == document_id),
            )
            document = doc_result.scalar_one_or_none()
            logger.info("Document lookup result: %s", document)
            if not document:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            # Check permissions (simplified - in real app, check Permission model)
            logger.info(
                "Permission check: document.owner_id=%s, user.id=%s, is_public=%s",
                document.owner_id,
                user.id,
                document.is_public,
            )
            if document.owner_id != user.id and not document.is_public:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            # Connect to document room
            user_info = {
                "id": str(user.id),
                "username": str(user.username),
                "email": str(user.email),
                "avatar_url": str(user.avatar_url) if user.avatar_url else "",
            }

            await manager.connect(websocket, str(document_id), user_info)
            logger.info("Connected to document room: %s", document_id)

            # Send current document users
            users = manager.get_document_users(str(document_id))
            await manager.send_personal_message(
                {"type": "document_users", "users": users},
                websocket,
            )

            try:
                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)

                    # Handle different message types
                    if message["type"] == "content_change":
                        # Broadcast content change to other users
                        await manager.broadcast_to_document(
                            str(document_id),
                            {
                                "type": "content_change",
                                "content": message["content"],
                                "user": user_info,
                                "timestamp": message.get("timestamp"),
                            },
                            exclude_websocket=websocket,
                        )

                    elif message["type"] == "cursor_position":
                        # Broadcast cursor position
                        await manager.broadcast_to_document(
                            str(document_id),
                            {
                                "type": "cursor_position",
                                "position": message["position"],
                                "user": user_info,
                            },
                            exclude_websocket=websocket,
                        )

                    elif message["type"] == "selection_change":
                        # Broadcast selection change
                        await manager.broadcast_to_document(
                            str(document_id),
                            {
                                "type": "selection_change",
                                "selection": message["selection"],
                                "user": user_info,
                            },
                            exclude_websocket=websocket,
                        )

            except Exception as e:
                logger.error("WebSocket error: %s", e)
            finally:
                await manager.disconnect(websocket, str(document_id))
            break

    except Exception as e:
        logger.error("WebSocket connection error: %s", e)
        await websocket.close()
