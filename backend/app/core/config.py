from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mukit:mukit@localhost:5432/mukit"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS - using string with custom validator
    ALLOWED_ORIGINS_STR: str = Field(
        default="http://localhost:3333,http://localhost:5173,http://127.0.0.1:3333",
        alias="ALLOWED_ORIGINS",
    )

    # Upload
    MAX_FILE_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"

    # App
    PROJECT_NAME: str = "Mukit"
    VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]


settings = Settings()
