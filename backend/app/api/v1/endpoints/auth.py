from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User as UserModel
from app.schemas.user import Token, User, UserCreate, UserLogin, UserPublic

router = APIRouter()


@router.post("/register", response_model=UserPublic)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)) -> UserPublic:
    # Check if user already exists
    result = await db.execute(select(UserModel).where(UserModel.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username is already taken
    result = await db.execute(
        select(UserModel).where(UserModel.username == user.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        bio=user.bio,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user  # type: ignore[return-value]


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Token:
    result = await db.execute(
        select(UserModel).where(UserModel.email == user_credentials.email),
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(
        user_credentials.password,
        str(user.hashed_password),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.email)})
    return {"access_token": access_token, "token_type": "bearer"}  # type: ignore[return-value]


@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: UserModel = Depends(get_current_active_user),
) -> UserModel:
    return current_user
