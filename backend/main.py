import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Mukit - Collaborative Document Editor",
    description="A scalable document collaboration platform",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,  # Disable automatic trailing slash redirects to prevent 307 errors
)

# CORS middleware
# Log allowed origins for debugging
print(f"🔒 CORS allowed origins: {settings.ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"message": "Mukit API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
