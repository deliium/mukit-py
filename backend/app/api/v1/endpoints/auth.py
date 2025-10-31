from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_user
from app.api.deps_services import get_auth_service
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserPublic
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserPublic)
async def register(
    user: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserPublic:
    """Register a new user."""
    return await auth_service.register(
        email=user.email,
        password=user.password,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        bio=user.bio,
    )


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    """Login user and get access token."""
    return await auth_service.login(
        email=user_credentials.email,
        password=user_credentials.password,
    )


@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
) -> UserPublic:
    """Get current user information."""
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )
