"""Test configuration and fixtures."""

import asyncio
import os
import sys
import uuid
from collections.abc import AsyncGenerator, Generator

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import get_password_hash

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.document import Document as DocumentModel
from app.models.user import User as UserModel
from app.models.workspace import Workspace as WorkspaceModel
from main import app

# Test database URL (using PostgreSQL for tests)
TEST_DATABASE_URL = "postgresql+asyncpg://mukit:mukit@localhost:5432/mukit_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    # Create a new engine for each test to avoid event loop conflicts
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    TestSessionLocal = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with test_engine.begin() as conn:
        # Ensure a clean schema each time to avoid legacy column types
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> httpx.AsyncClient:
    """Create a test client with database session override."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with httpx.AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> UserModel:
    """Create a test user."""
    user = UserModel(
        id=uuid.uuid4(),
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        first_name="Test",
        last_name="User",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_workspace(
    db_session: AsyncSession, test_user: UserModel
) -> WorkspaceModel:
    """Create a test workspace."""
    from app.models.workspace import WorkspaceMember as WorkspaceMemberModel

    workspace = WorkspaceModel(
        id=uuid.uuid4(),
        name="Test Workspace",
        description="A test workspace",
        slug="test-workspace",
        owner_id=test_user.id,
    )
    db_session.add(workspace)
    await db_session.commit()
    await db_session.refresh(workspace)

    # Add owner as workspace member
    member = WorkspaceMemberModel(
        workspace_id=workspace.id,
        user_id=test_user.id,
        role="owner",
    )
    db_session.add(member)
    await db_session.commit()

    return workspace


@pytest_asyncio.fixture
async def test_document(
    db_session: AsyncSession, test_user: UserModel, test_workspace: WorkspaceModel
) -> DocumentModel:
    """Create a test document."""
    from app.models.document import DocumentVersion as DocumentVersionModel

    document = DocumentModel(
        id=uuid.uuid4(),
        title="Test Document",
        description="A test document",
        content={"blocks": []},
        owner_id=test_user.id,
        workspace_id=test_workspace.id,
        is_public=False,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)

    # Create initial document version
    version = DocumentVersionModel(
        document_id=document.id,
        content={"blocks": []},
        author_id=test_user.id,
        version_number=1,
        change_description="Initial version",
        content_hash="test_hash",
    )
    db_session.add(version)
    await db_session.commit()

    return document


@pytest_asyncio.fixture
async def auth_headers(
    client: httpx.AsyncClient, test_user: UserModel
) -> dict[str, str]:
    """Get authentication headers for test user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": test_user.email, "password": "testpassword"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
