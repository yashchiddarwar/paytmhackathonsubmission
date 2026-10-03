"""
FastAPI dependency: resolves the currently-authenticated user from the Bearer token.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DBUser
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> DBUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise unauthorized
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise unauthorized
    user_id: str = payload.get("sub")
    if not user_id:
        raise unauthorized
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise unauthorized
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> DBUser | None:
    """Returns None instead of raising, for endpoints that work with or without auth."""
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    user_id: str = payload.get("sub")
    if not user_id:
        return None
    return db.query(DBUser).filter(DBUser.id == user_id).first()
