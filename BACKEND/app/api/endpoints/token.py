# File: app/api/endpoints/token.py
# This file defines the endpoint for user authentication and token generation.
# UPDATED to fix the 500 Internal Server Error during login.

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
# The 'verify_password' import is no longer needed for this simple login
from app.core.security import create_access_token
from app.schemas.token import Token

# --- Demo EMR user signup/signin imports ---
from pydantic import BaseModel, EmailStr
import csv
import os
import uuid
from typing import List, Dict

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticates the admin user and returns a JWT access token.
    The admin panel will call this endpoint with username and password.
    """
    # For this hackathon, we will perform a simple plain-text comparison
    # against the credentials stored in the settings.
    is_correct_username = form_data.username == settings.ADMIN_USERNAME
    is_correct_password = form_data.password == settings.ADMIN_PASSWORD

    # **THE FIX IS HERE**: The previous version had an incorrect call to a hashing
    # function which caused the server to crash. We now do a direct comparison.
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If credentials are correct, create and return the token.
    access_token = create_access_token(
        data={"sub": settings.ADMIN_USERNAME}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# -----------------------
# Demo EMR user endpoints
# -----------------------

# Storage location: data/demo frontend users/user_demo_frontend.csv
DEMO_USERS_DIR = os.path.join("data", "demo frontend users")
DEMO_USERS_CSV = os.path.join(DEMO_USERS_DIR, "user_demo_frontend.csv")
DEMO_HEADERS = ["user_id", "name", "email", "password"]


def _ensure_demo_users_csv():
    os.makedirs(DEMO_USERS_DIR, exist_ok=True)
    if not os.path.exists(DEMO_USERS_CSV) or os.path.getsize(DEMO_USERS_CSV) == 0:
        with open(DEMO_USERS_CSV, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(DEMO_HEADERS)


def _read_demo_users() -> List[Dict[str, str]]:
    if not os.path.exists(DEMO_USERS_CSV):
        return []
    users: List[Dict[str, str]] = []
    with open(DEMO_USERS_CSV, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.append({k: (v or "") for k, v in row.items()})
    return users


def _append_demo_user(row: Dict[str, str]) -> None:
    _ensure_demo_users_csv()
    # Ensure columns order
    with open(DEMO_USERS_CSV, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([row.get("user_id", ""), row.get("name", ""), row.get("email", ""), row.get("password", "")])


class DemoSignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class DemoSignInRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/demo/signup", response_model=Token)
async def sign_up_demo_emr_user(payload: DemoSignUpRequest):
    """
    Registers a new demo EMR user into CSV storage and returns a JWT token.
    - CSV file: data/demo frontend users/user_demo_frontend.csv
    - Columns: user_id, name, email, password
    Console logs: issued token and confirmation of CSV append.
    """
    _ensure_demo_users_csv()
    users = _read_demo_users()

    # Check duplicate email
    if any(u.get("email", "").lower() == payload.email.lower() for u in users):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered. Please sign in.")

    user_id = str(uuid.uuid4())
    new_row = {"user_id": user_id, "name": payload.name.strip(), "email": payload.email.strip().lower(), "password": payload.password}
    _append_demo_user(new_row)

    # Issue JWT with subject as email (or user_id). Using email for clarity.
    access_token = create_access_token(data={"sub": new_row["email"], "role": "demo"})

    # Console outputs per requirement
    print(f"[DEMO AUTH] New user added to user_demo_frontend.csv: user_id={user_id}, email={new_row['email']}")
    print(f"[DEMO AUTH] Issued token for {new_row['email']}: {access_token}")

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/demo/signin", response_model=Token)
async def sign_in_demo_emr_user(payload: DemoSignInRequest):
    """
    Authenticates an existing demo EMR user from CSV storage and returns a JWT token.
    Console logs: issued token. If user not found, prompts to sign up via error.
    """
    _ensure_demo_users_csv()
    users = _read_demo_users()

    matched = None
    for u in users:
        if u.get("email", "").lower() == payload.email.strip().lower() and u.get("password", "") == payload.password:
            matched = u
            break

    if not matched:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not registered. Please sign up.")

    access_token = create_access_token(data={"sub": matched.get("email", ""), "role": "demo"})
    print(f"[DEMO AUTH] Issued token for {matched.get('email', '')}: {access_token}")

    return {"access_token": access_token, "token_type": "bearer"}

