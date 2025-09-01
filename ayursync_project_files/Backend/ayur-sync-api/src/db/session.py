# src/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from src.core.config import settings

# Create the SQLAlchemy engine.
# The engine is the starting point for any SQLAlchemy application.
# It's the 'home base' for the database connection.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# Create a configured "Session" class.
# A Session is the primary interface for all database operations.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for our ORM models to inherit from.
# Any model we create will be a subclass of this Base.
Base = declarative_base()
