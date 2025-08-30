# scripts/ingest_namaste.py

import csv
from pathlib import Path
import sys

# We need to add the 'src' directory to Python's path to import our model.
# This is a common pattern for utility scripts in a project.
# It allows the script to see and use modules from the main application source.
project_root = Path(__file__).resolve().parents[1]
sys.path.append(str(project_root / "src"))

from models.terminology import Terminology

# Define the path to our data file relative to this script's location.
DATA_FILE_PATH = project_root / "data" / "NAMASTE.csv"

def ingest_data():
    """
    Reads terminology data from the CSV file, validates it using the
    Pydantic model, and prints the validated objects.
    
    In a real application, this function would connect to a database and
    insert the validated data instead of printing it.
    """
    print("Starting data ingestion...")
    
    validated_terms = []
    
    try:
        with open(DATA_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
            # DictReader reads each row of the CSV as a dictionary,
            # which is perfect for creating Pydantic model instances.
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                try:
                    # This is the core validation step.
                    # We attempt to create a Terminology instance from the row.
                    # Pydantic will automatically check if 'code' and 'term' exist
                    # and if they are strings.
                    term = Terminology(**row)
                    validated_terms.append(term)
                except Exception as e:
                    # If Pydantic validation fails, we print an error and skip the row.
                    print(f"Validation Error for row {row}: {e}")

    except FileNotFoundError:
        print(f"Error: Data file not found at {DATA_FILE_PATH}")
        return

    print(f"\nSuccessfully validated {len(validated_terms)} terms.")
    
    # Print the validated data to confirm it's working.
    for term in validated_terms:
        print(f"  - Code: {term.code}, Term: {term.term}")
        
    print("\nData ingestion process finished.")


if __name__ == "__main__":
    # This makes the script runnable from the command line.
    ingest_data()
