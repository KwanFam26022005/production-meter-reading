import hashlib
import hmac
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import SessionModel, User

settings = get_settings()
ph = PasswordHasher()


# Password Hashing
def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except (VerifyMismatchError, Exception):
        return False


# Session Token Helpers
def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# CSRF Token Helpers
def generate_csrf_token(session_token: str) -> str:
    return hmac.new(
        settings.csrf_secret.encode("utf-8"),
        session_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_csrf_token(session_token: str, csrf_token: str) -> bool:
    expected = generate_csrf_token(session_token)
    return hmac.compare_digest(expected, csrf_token)


# In-Memory Login Rate Limiter (Single Process V1)
class LoginRateLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: dict[str, list[datetime]] = {}
        self.lock = threading.Lock()

    def is_rate_limited(self, key: str) -> bool:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self.window_seconds)
        with self.lock:
            history = self.attempts.get(key, [])
            valid_history = [t for t in history if t > cutoff]
            self.attempts[key] = valid_history
            return len(valid_history) >= self.max_attempts

    def record_failed_attempt(self, key: str) -> None:
        now = datetime.now(timezone.utc)
        with self.lock:
            if key not in self.attempts:
                self.attempts[key] = []
            self.attempts[key].append(now)

    def reset(self, key: str) -> None:
        with self.lock:
            if key in self.attempts:
                del self.attempts[key]


login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.login_rate_limit_max_attempts,
    window_seconds=settings.login_rate_limit_window_seconds,
)


def create_user_session(
    db: Session,
    user: User,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> tuple[SessionModel, str]:
    token = generate_session_token()
    token_hash = hash_session_token(token)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.session_ttl_hours)

    session_obj = SessionModel(
        user_id=user.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=expires_at,
        last_seen_at=now,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return session_obj, token


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.is_cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.is_cookie_secure,
        samesite="lax",
    )


def get_current_session_and_user(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[SessionModel, User, str]:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không tồn tại.",
        )

    token_hash = hash_session_token(token)
    now = datetime.now(timezone.utc)

    session_obj = (
        db.query(SessionModel)
        .filter(
            SessionModel.token_hash == token_hash,
            SessionModel.revoked_at.is_(None),
        )
        .first()
    )

    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi.",
        )

    expires_at = session_obj.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn.",
        )

    user = db.query(User).filter(User.id == session_obj.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản người dùng đã bị vô hiệu hóa.",
        )

    # Update last_seen_at (throttled to avoid writing on every request)
    last_seen = session_obj.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    if (now - last_seen).total_seconds() > 60:
        session_obj.last_seen_at = now
        db.commit()

    return session_obj, user, token


def get_current_user(
    auth_data: tuple[SessionModel, User, str] = Depends(get_current_session_and_user),
) -> User:
    return auth_data[1]


get_current_active_user = get_current_user


def enforce_csrf(
    request: Request,
    auth_data: tuple[SessionModel, User, str] = Depends(get_current_session_and_user),
) -> None:
    # Require CSRF header for state-changing HTTP methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Thiếu mã CSRF Token (X-CSRF-Token).",
            )
        _, _, session_token = auth_data
        if not verify_csrf_token(session_token, csrf_header):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Mã CSRF Token không hợp lệ.",
            )


def require_admin(
    auth_data: tuple[SessionModel, User, str] = Depends(get_current_session_and_user),
) -> User:
    _, user, _ = auth_data
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện thao tác này.",
        )
    return user

