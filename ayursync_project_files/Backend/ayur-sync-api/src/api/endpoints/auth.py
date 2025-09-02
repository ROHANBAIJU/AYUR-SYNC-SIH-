# src/api/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from src.core.security import create_access_token, get_password_hash, verify_password
from src.models.auth import Token, UserInDB
from src.core.config import settings

# --- In-Memory Demo User Database ---
# For the SIH hackathon, we'll simulate a user database with one user.
# The password "ayursync_demo_password" is hashed and stored.
# In a real-world application, this would be a query to a users table in your database.
fake_users_db = {
    "doctor_demo": {
        "username": "doctor_demo",
        "hashed_password": get_password_hash("ayursync_demo_password"),
    }
}

# --- API Router ---
auth_router = APIRouter()

def get_user(db, username: str):
    """A helper function to retrieve a user from our fake database."""
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

@auth_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """

    This is the main token endpoint. A client (like our EMR UI) will send a
    POST request here with the username and password in the request body.

    - **username**: The user's username.
    - **password**: The user's plain-text password.

    If the credentials are correct, it returns a JWT access token.
    """
    # 1. Authenticate the user
    user = get_user(fake_users_db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Create the access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    print("ABHA SIMULATION TOKEN =",access_token)
    # 3. Return the token
    return {"access_token": access_token, "token_type": "bearer"}
