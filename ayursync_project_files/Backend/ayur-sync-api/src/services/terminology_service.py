# src/services/terminology_service.py

from sqlalchemy.orm import Session
from sqlalchemy import select

from src.db.models import Terminology as TerminologyModel
from src.models.terminology import Terminology as TerminologySchema

# This service contains the business logic for interacting with terminology data in the database.

def find_terms_by_filter(db: Session, filter_str: str) -> list[TerminologySchema]:
    """
    Finds terminology terms in the database using a case-insensitive filter.

    Args:
        db (Session): The database session.
        filter_str (str): The string to filter terms by.

    Returns:
        list[TerminologySchema]: A list of matching terminology objects.
    """
    # Create a query to select terms where the 'term' column contains the filter string (case-insensitive)
    stmt = select(TerminologyModel).where(TerminologyModel.term.ilike(f"%{filter_str}%"))
    
    # Execute the query and get all results
    results = db.scalars(stmt).all()
    
    return results

def find_term_by_code(db: Session, code: str) -> TerminologySchema | None:
    """
    Finds a single terminology term by its exact code.

    Args:
        db (Session): The database session.
        code (str): The exact code to find.

    Returns:
        TerminologySchema | None: The matching terminology object or None if not found.
    """
    stmt = select(TerminologyModel).where(TerminologyModel.code == code)
    result = db.scalars(stmt).first()
    return result

