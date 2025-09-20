# File: app/core/config.py
# This file has been updated to include the missing PROJECT_NAME and GEMINI_API_KEY attributes.

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NAMASTE-ICD API"
    
    # --- THIS IS THE LINE THAT WAS ADDED TO FIX THE ERROR ---
    GEMINI_API_KEY: str

    API_V1_STR: str = "/api"
    
    # Security settings
    SECRET_KEY: str = "a_very_secret_key_for_development_change_me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    ALGORITHM: str = "HS256"

    # Admin credentials
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "sih2024"
    
    # 👇 ADD THIS LINE
    DATABASE_URL: str
    
     # Add these four lines
    WHO_API_CLIENT_ID: str
    WHO_API_CLIENT_SECRET: str
    WHO_TOKEN_URL: str
    WHO_API_BASE_URL: str


    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

