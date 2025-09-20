# File: app/schemas/token.py
# This file defines the Pydantic models for authentication tokens.

from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    """
    Schema for the JWT access token response.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Schema for the data contained within a JWT.
    """
    username: Optional[str] = None
