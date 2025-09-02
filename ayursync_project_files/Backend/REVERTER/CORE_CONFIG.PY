# src/core/config.py

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Manages application settings using Pydantic.
    It automatically reads environment variables for configuration.
    """
    
    # --- Database Configuration ---
    # This constructs the database URL from environment variables or defaults.
    # Format: postgresql+psycopg2://user:password@host:port/dbname
    DATABASE_USER: str = "ayursync_user"
    DATABASE_PASSWORD: str = "ayursync_secret_password"
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "ayursync_db"

    # SQLAlchemy requires the database URL in a specific format.
    # We build it here from the individual components.
    @property
    def DATABASE_URL(self) -> str:
        """Constructs the full database connection URL."""
        return (
            f"postgresql+psycopg2://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@"
            f"{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )

    class Config:
        # Specifies a file to load environment variables from, useful for development.
        env_file = ".env"
        env_file_encoding = "utf-8"

# Create a single, importable instance of the settings.
settings = Settings()



***** core/config.py