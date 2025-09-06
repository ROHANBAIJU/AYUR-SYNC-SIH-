import sys
import os

# --- Setup Project Path ---
# CORRECTED: Add the project root to the Python path
# This allows the script to correctly import 'src.db.session'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

from src.db.session import engine
#from src.db.base import Base
from sqlalchemy.orm import declarative_base

# declarative_base() is the standard starting point for SQLAlchemy models.
Base = declarative_base()



def init_db():
    """
    Creates all database tables defined in the SQLAlchemy models.
    This is safe to run multiple times; it will only create tables that do not already exist.
    """
    print("Initializing the database...")
    try:
        Base.metadata.create_all(bind=engine)
        print("  -> Database tables created successfully (if they didn't already exist).")
    except Exception as e:
        print(f"An error occurred during database initialization: {e}")

if __name__ == "__main__":
    init_db()

