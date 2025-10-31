import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.api.deps_services import get_workspace_service
from app.models.user import User
from app.schemas.workspace import Workspace, WorkspaceCreate, WorkspaceUpdate
from app.services.dto import CreateWorkspaceDTO, UpdateWorkspaceDTO
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.post("/", response_model=Workspace)
async def create_workspace(
    workspace: WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Workspace:
    """Create a new workspace."""
    dto = CreateWorkspaceDTO(
        name=workspace.name,
        description=workspace.description,
        slug=workspace.slug,
        owner_id=current_user.id,
    )
    return await workspace_service.create_workspace(dto, current_user.id)


@router.get("/", response_model=list[Workspace])
async def get_workspaces(
    current_user: User = Depends(get_current_active_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[Workspace]:
    """Get workspaces where user is a member."""
    return await workspace_service.get_workspaces(current_user.id)


@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Workspace:
    """Get workspace by ID."""
    return await workspace_service.get_workspace(workspace_id, current_user.id)


@router.put("/{workspace_id}", response_model=Workspace)
async def update_workspace(
    workspace_id: uuid.UUID,
    workspace_update: WorkspaceUpdate,
    current_user: User = Depends(get_current_active_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Workspace:
    """Update workspace."""
    dto = UpdateWorkspaceDTO(
        name=workspace_update.name,
        description=workspace_update.description,
        avatar_url=workspace_update.avatar_url,
    )
    return await workspace_service.update_workspace(workspace_id, dto, current_user.id)
