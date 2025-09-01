# scripts/ingest_namaste.py

import csv
import os
import sys

# Add the project root to the Python path to allow for absolute imports
# This is necessary because we are running this script directly.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)

# Now we can use absolute imports from our 'src' folder
from src.db.session import SessionLocal, engine
from src.db.models import Terminology, Base

def ingest_data():
    """
    Reads terminology data from the NAMASTE.csv file and inserts it into the database.
    This script is designed to be run once to set up the initial data.
    """
    print("Starting data ingestion into the database...")

    # Create a new database session
    db = SessionLocal()

    # Path to the CSV file
    csv_file_path = os.path.join(project_root, 'data', 'NAMASTE.csv')
    
    # Create the table in the database if it doesn't exist
    # Base.metadata.create_all() checks for the existence of tables first
    # and only creates those that are missing.
    print("Creating database tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            terms_added = 0
            for row in reader:
                # For each row, check if the code already exists in the database
                # to prevent duplicates on re-running the script.
                existing_term = db.query(Terminology).filter(Terminology.code == row['code']).first()
                
                if not existing_term:
                    # If the term does not exist, create a new Terminology object
                    new_term = Terminology(
                        code=row['code'].strip(),
                        term=row['term'].strip()
                    )
                    # Add the new object to the session (staging area)
                    db.add(new_term)
                    terms_added += 1
            
            # Commit all the staged changes to the database at once
            if terms_added > 0:
                db.commit()
                print(f"Successfully added {terms_added} new terms to the database.")
            else:
                print("No new terms to add. Database is already up-to-date.")

    except FileNotFoundError:
        print(f"Error: The file was not found at {csv_file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback() # Roll back the transaction in case of an error
    finally:
        db.close() # Always close the session

if __name__ == "__main__":
    ingest_data()
    print("Data ingestion process finished.")

