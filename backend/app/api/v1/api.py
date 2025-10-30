from fastapi import APIRouter

from app.api.v1.endpoints import auth, documents, websocket, workspaces

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(websocket.router, tags=["websocket"])
