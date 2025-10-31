import json
import logging
import uuid

from fastapi import WebSocket, status
from starlette.websockets import WebSocketState, WebSocketDisconnect
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
        # Accept as early as possible to avoid reads before accept
        await websocket.accept()
        from app.core.database import get_db
        from app.core.security import verify_token
        from app.models.workspace import WorkspaceMember as WorkspaceMemberModel

        email = verify_token(token)
        logger.info("Token verification result: email=%s", email)
        if not email:
            await _safe_close(websocket, status.WS_1008_POLICY_VIOLATION)
            return

        # Get database session
        async for db in get_db():
            # Get user from database
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            logger.info("User lookup result: %s", user)
            if not user:
                await _safe_close(websocket, status.WS_1008_POLICY_VIOLATION)
                return

            # Check if document exists and user has access
            doc_result = await db.execute(
                select(DocumentModel).where(DocumentModel.id == document_id),
            )
            document = doc_result.scalar_one_or_none()
            logger.info("Document lookup result: %s", document)
            if not document:
                await _safe_close(websocket, status.WS_1008_POLICY_VIOLATION)
                return

            # Check permissions: owner, public, or workspace member
            logger.info(
                "Permission check: document.owner_id=%s, user.id=%s, is_public=%s, workspace_id=%s",
                document.owner_id,
                user.id,
                document.is_public,
                document.workspace_id,
            )
            has_access = document.is_public or document.owner_id == user.id
            if not has_access and document.workspace_id:
                wm_result = await db.execute(
                    select(WorkspaceMemberModel).where(
                        WorkspaceMemberModel.workspace_id == document.workspace_id,
                        WorkspaceMemberModel.user_id == user.id,
                    )
                )
                has_access = wm_result.scalar_one_or_none() is not None
            if not has_access:
                await _safe_close(websocket, status.WS_1008_POLICY_VIOLATION)
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
                    # break if socket already closed
                    if websocket.application_state is not WebSocketState.CONNECTED:
                        break
                    try:
                        data = await websocket.receive_text()
                    except (WebSocketDisconnect, RuntimeError):
                        # client closed connection or read on closed socket
                        break
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

            except Exception:
                logger.exception("WebSocket error during message loop")
            finally:
                await manager.disconnect(websocket, str(document_id))
            break

    except Exception:
        logger.exception("WebSocket connection error before/after accept")
        await _safe_close(websocket)


async def _safe_close(websocket: WebSocket, code: int | None = None) -> None:
    try:
        # Avoid sending close twice
        if websocket.application_state is WebSocketState.CONNECTED:
            if code is not None:
                await websocket.close(code=code)
            else:
                await websocket.close()
    except RuntimeError:
        # Already closed or close frame sent
        pass
