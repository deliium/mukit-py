"""Tests for security utilities."""

from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
    verify_token,
)


class TestSecurity:
    """Test security utilities."""

    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "testpassword123"
        hashed = get_password_hash(password)

        # Hash should be different from original password
        assert hashed != password

        # Hash should be a string
        assert isinstance(hashed, str)

        # Hash should be consistent
        hashed2 = get_password_hash(password)
        assert hashed == hashed2

    def test_password_verification(self):
        """Test password verification."""
        password = "testpassword123"
        hashed = get_password_hash(password)

        # Correct password should verify
        assert verify_password(password, hashed) is True

        # Wrong password should not verify
        assert verify_password("wrongpassword", hashed) is False

        # Empty password should not verify
        assert verify_password("", hashed) is False

    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)

        # Token should be a string
        assert isinstance(token, str)

        # Token should not be empty
        assert len(token) > 0

    def test_create_access_token_with_expires_delta(self):
        """Test access token creation with custom expiration."""
        from datetime import timedelta

        data = {"sub": "test@example.com"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta)

        # Token should be a string
        assert isinstance(token, str)

        # Token should not be empty
        assert len(token) > 0

    def test_verify_token(self):
        """Test token verification."""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)

        # Valid token should return email
        email = verify_token(token)
        assert email == "test@example.com"

    def test_verify_invalid_token(self):
        """Test verification of invalid token."""
        # Invalid token should return None
        email = verify_token("invalid_token")
        assert email is None

        # Empty token should return None
        email = verify_token("")
        assert email is None

    def test_verify_expired_token(self):
        """Test verification of expired token."""
        from datetime import timedelta

        data = {"sub": "test@example.com"}
        # Create token with very short expiration
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_access_token(data, expires_delta)

        # Expired token should return None
        email = verify_token(token)
        assert email is None
