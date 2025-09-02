# src/core/security.py

import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.core.config import settings

# --- Password Hashing Setup ---
# We use CryptContext to handle password hashing. bcrypt is the chosen algorithm.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- OAuth2 and Token Setup ---
# This defines the security scheme. The tokenUrl is the endpoint where a client
# will post their username and password to get a token. We will create this endpoint later.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

# --- JWT Core Functions ---

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Creates a new JWT access token.

    Args:
        data: The data to encode in the token (e.g., user's ID or username).
        expires_delta: The lifespan of the token. If not provided, a default is used.

    Returns:
        The encoded JWT as a string.
    """
    to_encode = data.copy()
    
    # Set the token's expiration time
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default expiration time if none is provided
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Encode the token with our secret key and the specified algorithm
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a hashed one.

    Args:
        plain_password: The password provided by the user during login.
        hashed_password: The password stored in the database.

    Returns:
        True if the passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain-text password.

    Args:
        password: The plain-text password to hash.

    Returns:
        The hashed password as a string.
    """
    return pwd_context.hash(password)

def get_current_user_from_token(token: str = Depends(oauth2_scheme)) -> str:
    """
    A FastAPI dependency that decodes and validates a token from the request headers.
    This function will be used to protect our endpoints.

    Args:
        token: The token string, automatically extracted from the request by FastAPI.

    Returns:
        The username (subject) from the token if the token is valid.
        
    Raises:
        HTTPException: If the token is invalid, expired, or credentials are bad.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token using our secret key and algorithm
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Extract the username from the 'sub' (subject) claim
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except jwt.PyJWTError:
        # If any decoding error occurs, raise the exception
        raise credentials_exception
        
    # In a real app, you would also fetch the user from the database here
    # to ensure they still exist and are active.
    # For our prototype, returning the username is sufficient.
    
    return username

