# File: app/core/security.py
# This file contains security-related utility functions, such as password hashing
# and JWT creation.

from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.core.config import settings
import hmac, base64, hashlib, json
from app.schemas.token import TokenData

# This creates an instance of OAuth2PasswordBearer.
# The `tokenUrl` points to the endpoint that the client will use to get the token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Setup password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- THIS IS THE CRUCIAL FUNCTION THAT WAS ADDED ---
def get_current_user(token: str = Depends(oauth2_scheme)) -> Any:
    """
    Decodes the JWT token to get the current user.
    This is the dependency used in protected endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # In a real app, you would fetch the user from the DB here.
    # For this project, the username is sufficient for authorization.
    user = {"username": token_data.username} 
    if user is None:
        raise credentials_exception
    return user


# Unified principal guard: accepts normal JWT or mock ABHA tokens.
def get_current_principal(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """
    Returns an authenticated principal dict from the Authorization header.
    Supports:
    - Bearer <JWT> signed with our SECRET_KEY
    - Bearer ABHA_<opaque> as a mock ABHA token for development
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not authorization or not authorization.lower().startswith("bearer "):
        raise credentials_exception
    token = authorization.split(" ", 1)[1].strip()
    # ABHA token handling (mock or hmac)
    if token.startswith("ABHA_"):
        mode = settings.ABHA_VALIDATION_MODE.lower()
        if mode == 'mock':
            return {"sub": token, "auth": "abha-mock"}
        if mode == 'hmac':
            # Expected format: ABHA_<base64url(payload)>.sig=<hex>
            try:
                body_part = token.split('_',1)[1]
                if '.sig=' not in body_part:
                    raise ValueError('missing signature segment')
                payload_b64, sig_hex = body_part.split('.sig=',1)
                # Normalize padding for base64url
                padding = '=' * (-len(payload_b64) % 4)
                raw = base64.urlsafe_b64decode(payload_b64 + padding)
                expected = hmac.new(settings.ABHA_HMAC_SECRET.encode('utf-8'), raw, hashlib.sha256).hexdigest()
                if not hmac.compare_digest(expected, sig_hex):
                    raise ValueError('bad signature')
                payload = json.loads(raw.decode('utf-8')) if raw else {}
                sub = payload.get('sub') or payload.get('abha') or 'abha-anon'
                exp = payload.get('exp')
                if exp and datetime.fromtimestamp(exp, timezone.utc) < datetime.now(timezone.utc):
                    raise ValueError('expired')
                return {"sub": sub, "auth": "abha-hmac", "claims": payload}
            except Exception:
                raise credentials_exception
    # Try JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: str = payload.get("sub")
        if not sub:
            raise credentials_exception
        return {"sub": sub, "auth": "jwt"}
    except JWTError:
        raise credentials_exception

