import uuid

from fastapi import APIRouter, Query, WebSocket

from app.websocket.document_websocket import websocket_endpoint

router = APIRouter()


@router.websocket("/documents/{document_id}/ws")
async def document_websocket(
    websocket: WebSocket,
    document_id: uuid.UUID,
    token: str = Query(...),
) -> None:
    await websocket_endpoint(websocket, document_id, token)
