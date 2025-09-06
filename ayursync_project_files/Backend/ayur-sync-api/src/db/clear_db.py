import sys
import os

# --- Setup Project Path ---
# This allows the script to correctly import 'src' modules
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

from sqlalchemy.orm import Session
from src.db.session import SessionLocal
from src.db.models import Terminology

def clear_data():
    """
    Connects to the database and clears all data from the 'terminologies' table.
    This script assumes the table already exists.
    """
    print("Connecting to the database to clear data...")
    db: Session = SessionLocal()
    try:
        print("  -> Clearing all existing data from the 'terminologies' table...")
        # num_deleted = db.query(Terminology).delete()
        # The above line is more efficient but can have issues with some DB setups.
        # A safer, more compatible approach is to fetch and delete.
        all_items = db.query(Terminology).all()
        num_deleted = len(all_items)
        for item in all_items:
            db.delete(item)
        
        db.commit()
        print(f"  -> Successfully cleared {num_deleted} rows.")
    except Exception as e:
        print(f"\nAn error occurred while clearing data: {e}")
        print("  -> This might be okay if the table was already empty.")
        db.rollback()
    finally:
        db.close()
        print("Data clearing process finished.")

if __name__ == "__main__":
    clear_data()
