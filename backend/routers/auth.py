from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import httpx
import logging

from database import get_db
from models import User, NotificationType
from schemas.user_schemas import UserLogin, Token, UserCreate, User as UserSchema, PasswordReset
from services.notification_service import create_notification_for_admins

logger = logging.getLogger(__name__)
router = APIRouter()

# FORGE webhook URLs (try local first, then public)
FORGE_WEBHOOK_URLS = [
    "http://aci-forge-backend-1:8000/api/notifications/webhook/login",
    "https://api-forge.americancircuits.net/api/notifications/webhook/login",
]


def notify_forge_login(username: str, full_name: str):
    """Send login notification to FORGE (non-blocking best-effort)."""
    sso_secret = os.getenv("SSO_SECRET_KEY", "")
    if not sso_secret:
        return
    login_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    payload = {
        "app": "nexus",
        "username": username,
        "full_name": full_name,
        "login_time": login_time,
        "secret": sso_secret,
    }
    for url in FORGE_WEBHOOK_URLS:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    return
        except Exception as e:
            logger.debug(f"FORGE webhook failed for {url}: {e}")
            continue

# Security
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise ValueError(
        "SECRET_KEY environment variable must be set and be at least 32 characters long. "
        "Generate one with: python3 -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/login")
async def login(user_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Create login notification for all admins
    try:
        create_notification_for_admins(
            db=db,
            notification_type=NotificationType.USER_LOGIN,
            title=f"User Login: {user.first_name}",
            message=f"{user.first_name} ({user.role.value}) logged in",
            reference_id=user.id,
            reference_type="user_login",
            created_by_username=user.username
        )
    except Exception as e:
        # Don't fail login if notification creation fails
        db.rollback()
        print(f"Failed to create login notification: {str(e)}")

    # Notify FORGE about this Nexus login (non-blocking)
    try:
        notify_forge_login(username=user.username, full_name=user.first_name)
    except Exception:
        pass

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "is_approver": user.is_approver,
            "is_itar": getattr(user, 'is_itar', False),
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
    }

@router.post("/register", response_model=UserSchema)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password,
        role=user_data.role,
        is_approver=user_data.is_approver
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/sso/callback")
async def sso_callback(request: Request, db: Session = Depends(get_db)):
    """Handle SSO callback from ACI FORGE. Validates SSO token and returns NEXUS JWT."""
    sso_secret = os.getenv("SSO_SECRET_KEY", "")
    if not sso_secret:
        raise HTTPException(status_code=500, detail="SSO not configured")

    body = await request.json()
    sso_token = body.get("token", "")
    if not sso_token:
        raise HTTPException(status_code=400, detail="Missing SSO token")

    try:
        payload = jwt.decode(sso_token, sso_secret, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired SSO token")

    if payload.get("type") != "sso":
        raise HTTPException(status_code=401, detail="Invalid token type")
    if payload.get("target_app") != "nexus":
        raise HTTPException(status_code=401, detail="Token not intended for this app")

    username = payload.get("sub", "")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User '{username}' not found in NEXUS. Please ask an admin to create your NEXUS account."
        )
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is inactive in NEXUS")

    # Create NEXUS JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Create SSO login notification for admins
    try:
        create_notification_for_admins(
            db=db,
            notification_type=NotificationType.USER_LOGIN,
            title=f"SSO Login via ACI FORGE: {user.first_name}",
            message=f"{user.first_name} ({user.role.value}) logged in via ACI FORGE SSO",
            reference_id=user.id,
            reference_type="sso_login",
            created_by_username=user.username
        )
    except Exception as e:
        db.rollback()
        print(f"Failed to create SSO login notification: {str(e)}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "is_approver": user.is_approver,
            "is_itar": getattr(user, 'is_itar', False),
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        },
        "sso": True
    }


@router.post("/reset-password")
async def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db)):
    # Find user by username
    user = db.query(User).filter(User.username == reset_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify old password
    if not verify_password(reset_data.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password"
        )

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password reset successful"}