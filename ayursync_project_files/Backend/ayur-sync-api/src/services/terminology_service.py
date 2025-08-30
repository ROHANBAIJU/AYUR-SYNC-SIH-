# src/services/terminology_service.py

import csv
from pathlib import Path
import sys
from typing import List

# Add src to path to import our Pydantic models
project_root = Path(__file__).resolve().parents[2]
sys.path.append(str(project_root / "src"))
DATA_FILE_PATH = project_root / "data" / "NAMASTE.csv"

from models.terminology import Terminology

class TerminologyService:
    """
    Handles the business logic for terminology operations.
    
    For this prototype, it loads data from the CSV into memory on startup.
    In a production system, this service would interact with a database.
    """
    _terms: List[Terminology] = []

    def __init__(self):
        """
        Initializes the service and loads data if it's not already loaded.
        """
        self._load_data()

    def _load_data(self):
        """
        Private method to load data from the CSV into a class variable.
        This ensures the data is loaded only once.
        """
        if not TerminologyService._terms:
            print("Loading terminology data into memory...")
            try:
                with open(DATA_FILE_PATH, mode='r', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        # Use our Pydantic model for validation
                        TerminologyService._terms.append(Terminology(**row))
                print(f"Successfully loaded {len(TerminologyService._terms)} terms.")
            except FileNotFoundError:
                print(f"ERROR: Data file not found at {DATA_FILE_PATH}")
    
    def search_terms(self, query: str) -> List[Terminology]:
        """
        Performs a simple, case-insensitive search for terms.
        """
        if not query:
            return []
        
        search_query = query.lower()
        # This is a list comprehension, a concise way to build lists.
        # It iterates through all terms and includes only those that match.
        results = [
            term for term in self._terms 
            if search_query in term.term.lower()
        ]
        return results

# Create a single, shared instance of the service.
# Any part of our app can import and use this one instance.
terminology_service = TerminologyService()
