# src/core/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # --- Database Settings ---
    # These values are read from the environment variables defined in docker-compose.yml
    POSTGRES_USER: str = "ayursync_user"
    POSTGRES_PASSWORD: str = "ayursync_secret_password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_DB: str = "ayursync_db"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        """Constructs the full database connection string."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # --- JWT Security Settings ---
    # A secret key used to sign the JWTs.
    # In a real production environment, this MUST be a long, complex, random string
    # and should be loaded from a secure vault or environment variable, not hardcoded.
    SECRET_KEY: str = "a_very_secret_key_for_sih_hackathon_demo"
    
    # The algorithm used to sign the JWT. HS256 is a common choice.
    ALGORITHM: str = "HS256"
    
    # The default lifespan of an access token, in minutes.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        case_sensitive = True

# Create a single, reusable instance of the Settings class
settings = Settings()

