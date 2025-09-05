
#scripts/ingest_namaste.py

import csv
import os
import sys

# Add the project root to the Python path to allow for absolute imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from sqlalchemy.orm import Session
from src.db.session import SessionLocal, engine
from src.db.models import Base, Terminology, ConceptMap

def ingest_terminologies(db: Session, file_path: str):
    """Reads the terminology CSV and populates the 'terminologies' table."""
    print("Ingesting terminologies...")
    
    with open(file_path, mode='r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        
        # Keep track of codes to avoid duplicates
        existing_codes = {term.code for term in db.query(Terminology.code).all()}
        
        terms_to_add = []
        for row in csv_reader:
            code = row.get("code")
            term = row.get("term")
            
            # Basic validation
            if not code or not term:
                print(f"Skipping invalid row: {row}")
                continue
                
            if code not in existing_codes:
                # Prepare the object to be added, including optional fields
                new_term = Terminology(
                    code=code,
                    term=term,
                    definition=row.get("definition"), # Safely get optional field
                    symptoms=row.get("symptoms")      # Safely get optional field
                )
                terms_to_add.append(new_term)
                existing_codes.add(code)

        if terms_to_add:
            db.bulk_save_objects(terms_to_add)
            db.commit()
            print(f"  -> Added {len(terms_to_add)} new terminologies to the database.")
        else:
            print("  -> Terminology data is already up-to-date.")

def ingest_concept_maps(db: Session, file_path: str):
    """Reads the concept map CSV and populates the 'concept_maps' table."""
    print("Ingesting concept maps...")
    
    with open(file_path, mode='r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        
        maps_to_add = []
        for row in csv_reader:
            source_code = row.get("source_code")
            target_code = row.get("target_code")
            
            # Basic validation
            if not source_code or not target_code:
                print(f"Skipping invalid map row: {row}")
                continue
            
            # Note: A real system would have more robust checks here
            new_map = ConceptMap(
                source_code=source_code,
                target_code=target_code,
                relationship=row.get("relationship", "exact-match")
            )
            maps_to_add.append(new_map)
            
        if maps_to_add:
            db.bulk_save_objects(maps_to_add)
            db.commit()
            print(f"  -> Added {len(maps_to_add)} new concept maps to the database.")
        else:
            print("  -> Concept map data is already up-to-date.")


def main():
    """Main function to run the ingestion process."""
    print("Starting data ingestion into the database...")
    db = SessionLocal()
    
    try:
        # Get the absolute paths to the data files
        base_data_path = os.path.join(project_root, "data")
        terminology_file = os.path.join(base_data_path, "NAMASTE.csv")
        concept_map_file = os.path.join(base_data_path, "concept_map.csv")

        print("Creating database tables if they don't exist...")
        # This will create both 'terminologies' and 'concept_maps' tables
        Base.metadata.create_all(bind=engine)
        print("Tables created or already exist.")

        # Clear existing data to ensure a clean slate, respecting foreign key constraints
        print("Clearing old data...")
        db.query(ConceptMap).delete()
        db.query(Terminology).delete()
        db.commit()
        
        # Ingest the data
        ingest_terminologies(db, terminology_file)
        ingest_concept_maps(db, concept_map_file)
        
        print("\nData ingestion process finished successfully.")
    
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

