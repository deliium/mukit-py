import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.models.workspace import Workspace as WorkspaceModel
from app.models.workspace import WorkspaceMember as WorkspaceMemberModel
from app.schemas.workspace import Workspace, WorkspaceCreate, WorkspaceUpdate

router = APIRouter()


@router.post("/", response_model=Workspace)
async def create_workspace(
    workspace: WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    # Check if slug is unique
    result = await db.execute(
        select(WorkspaceModel).where(WorkspaceModel.slug == workspace.slug),
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Workspace slug already exists")

    db_workspace = WorkspaceModel(
        name=workspace.name,
        description=workspace.description,
        slug=workspace.slug,
        owner_id=current_user.id,
    )

    db.add(db_workspace)
    await db.commit()
    await db.refresh(db_workspace)

    # Add owner as workspace member
    member = WorkspaceMemberModel(
        workspace_id=db_workspace.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    await db.commit()

    return db_workspace  # type: ignore[return-value]


@router.get("/", response_model=list[Workspace])
async def get_workspaces(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[Workspace]:
    # Get workspaces where user is owner or member
    result = await db.execute(
        select(WorkspaceModel)
        .join(WorkspaceMemberModel)
        .where(WorkspaceMemberModel.user_id == current_user.id),
    )
    return result.scalars().all()  # type: ignore[return-value]


@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    result = await db.execute(
        select(WorkspaceModel).where(WorkspaceModel.id == workspace_id),
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if user has access to workspace
    result = await db.execute(
        select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == current_user.id,
        ),
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    return workspace  # type: ignore[return-value]


@router.put("/{workspace_id}", response_model=Workspace)
async def update_workspace(
    workspace_id: uuid.UUID,
    workspace_update: WorkspaceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    result = await db.execute(
        select(WorkspaceModel).where(WorkspaceModel.id == workspace_id),
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if user is owner or admin
    result = await db.execute(
        select(WorkspaceMemberModel).where(
            WorkspaceMemberModel.workspace_id == workspace_id,
            WorkspaceMemberModel.user_id == current_user.id,
            WorkspaceMemberModel.role.in_(["owner", "admin"]),
        ),
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    # Update workspace
    for field, value in workspace_update.model_dump(exclude_unset=True).items():
        setattr(workspace, field, value)

    await db.commit()
    await db.refresh(workspace)

    return workspace  # type: ignore[return-value]
