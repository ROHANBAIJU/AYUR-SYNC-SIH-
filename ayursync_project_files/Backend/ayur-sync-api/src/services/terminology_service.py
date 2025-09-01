# src/services/terminology_service.py

from sqlalchemy.orm import Session
from src.db.models import Terminology as TerminologyModel

def lookup_terms(db: Session, filter_str: str) -> list[TerminologyModel]:
    """
    Searches for terminology terms in the database.

    Args:
        db: The SQLAlchemy database session.
        filter_str: The string to filter terms by (case-insensitive).

    Returns:
        A list of matching Terminology objects from the database.
    """
    if not filter_str:
        return []
    
    # Perform a case-insensitive search on the 'term' column.
    # The '%' are a wildcard, so it matches any term containing the filter string.
    # .limit(10) prevents returning too many results for broad searches.
    return db.query(TerminologyModel).filter(
        TerminologyModel.term.ilike(f"%{filter_str}%")
    ).limit(10).all()

def get_term_by_code(db: Session, code: str) -> TerminologyModel | None:
    """
    Retrieves a single terminology term from the database by its exact code.

    Args:
        db: The SQLAlchemy database session.
        code: The exact code of the term to find.

    Returns:
        The Terminology object if found, otherwise None.
    """
    return db.query(TerminologyModel).filter(TerminologyModel.code == code).first()

