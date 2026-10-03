"""
Authentication router: register, login, refresh, me.
"""
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DBUser
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_enough(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ProfileUpdateRequest(BaseModel):
    fullName: str | None = None
    phone: str | None = None
    ckyc: str | None = None
    aadhaarLast4: str | None = None
    pan: str | None = None
    nomineeName: str | None = None
    nomineeRelation: str | None = None
    nomineePhone: str | None = None
    memberTier: str | None = None
    digilockerSynced: bool | None = None
    mparivahanSynced: bool | None = None
    abhaSynced: bool | None = None
    nicrSynced: bool | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter(DBUser.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user = DBUser(
        id=str(uuid.uuid4()),
        email=body.email,
        full_name=body.full_name or body.email.split("@")[0],
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        {"sub": user.id},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token = create_access_token(
        {"sub": user.id},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """Instant 1-click login for evaluation and testing. Auto-provisions demo account if not exists."""
    demo_email = "demo@claimease.com"
    user = db.query(DBUser).filter(DBUser.email == demo_email).first()
    if not user:
        user = DBUser(
            id=str(uuid.uuid4()),
            email=demo_email,
            full_name="Demo Evaluator",
            hashed_password=hash_password("demo123"),
            phone="+91 98450 12894",
            ckyc="8920194819",
            aadhaar_last4="9214",
            pan="ABCDE1234F",
            nominee_name="Priya Sharma",
            nominee_relation="Spouse",
            nominee_phone="+91 98765 09876",
            member_tier="ClaimEase Pro Member"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_access_token(
        {"sub": user.id},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}


@router.get("/me")
def me(current_user: DBUser = Depends(get_current_user)):
    return current_user.to_dict()


@router.put("/profile")
def update_profile(
    body: ProfileUpdateRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.fullName is not None:
        current_user.full_name = body.fullName
    if body.phone is not None:
        current_user.phone = body.phone
    if body.ckyc is not None:
        current_user.ckyc = body.ckyc
    if body.aadhaarLast4 is not None:
        current_user.aadhaar_last4 = body.aadhaarLast4
    if body.pan is not None:
        current_user.pan = body.pan
    if body.nomineeName is not None:
        current_user.nominee_name = body.nomineeName
    if body.nomineeRelation is not None:
        current_user.nominee_relation = body.nomineeRelation
    if body.nomineePhone is not None:
        current_user.nominee_phone = body.nomineePhone
    if body.memberTier is not None:
        current_user.member_tier = body.memberTier
    if body.digilockerSynced is not None:
        current_user.digilocker_synced = body.digilockerSynced
    if body.mparivahanSynced is not None:
        current_user.mparivahan_synced = body.mparivahanSynced
    if body.abhaSynced is not None:
        current_user.abha_synced = body.abhaSynced
    if body.nicrSynced is not None:
        current_user.nicr_synced = body.nicrSynced
    
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict()


@router.post("/logout")
def logout():
    # JWT is stateless; client discards the token.
    return {"success": True, "message": "Logged out."}
