import hashlib
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Simple SHA-256 hashing for now
    password_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    return password_hash == hashed_password


def get_password_hash(password: str) -> str:
    # Simple SHA-256 hashing for now
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(
    data: dict[str, str],
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(tz=UTC) + expires_delta
    else:
        expire = datetime.now(tz=UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )
    to_encode.update({"exp": str(int(expire.timestamp()))})
    return str(
        jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        ),
    )


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        email = payload.get("sub")
        if email is None:
            return None
        return str(email)
    except JWTError:
        return None
