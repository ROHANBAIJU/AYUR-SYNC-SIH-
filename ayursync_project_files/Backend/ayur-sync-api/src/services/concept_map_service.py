# src/services/concept_map_service.py

from sqlalchemy.orm import Session
from src.db.models import ConceptMap as ConceptMapModel
from src.models.terminology import TranslationResult, Terminology as TerminologySchema
from src.services import terminology_service

def translate_code(db: Session, code: str) -> TranslationResult:
    """
    Translates a given terminology code by finding its mapped equivalent
    using the dedicated 'concept_maps' table in the database.

    The logic is now database-driven:
    1. Finds the source term object for the given code.
    2. Queries the 'concept_maps' table to find a mapping for that source code.
    3. If a map is found, it retrieves the target code.
    4. Fetches the full term object for the target code.
    5. Returns the complete translation result.

    Args:
        db: The SQLAlchemy database session.
        code: The source code to translate (e.g., "ASU25.14").

    Returns:
        A TranslationResult object with the source and target terms if found.
    """
    # 1. Find the source term object from the database to ensure it's valid
    source_db_term = terminology_service.find_term_by_code(db, code)

    if not source_db_term:
        return TranslationResult(found=False)

    # Convert to Pydantic schema for the response
    source_schema_term = TerminologySchema.from_orm(source_db_term)

    # 2. Query the concept_maps table to find the mapping
    mapping = db.query(ConceptMapModel).filter(ConceptMapModel.source_code == code).first()

    if not mapping:
        # If no map exists in the database for this code, we can't translate it.
        return TranslationResult(found=False, source_term=source_schema_term)

    # 3. We found a map, so get the target code from it
    target_code = mapping.target_code

    # 4. Fetch the full terminology object for the target code
    target_db_term = terminology_service.find_term_by_code(db, target_code)

    if not target_db_term:
        # This would indicate an orphaned mapping, but our foreign key prevents this.
        # Still, it's good practice to handle it.
        return TranslationResult(found=False, source_term=source_schema_term)
    
    # Convert target to Pydantic schema
    target_schema_term = TerminologySchema.from_orm(target_db_term)

    return TranslationResult(
        found=True,
        source_term=source_schema_term,
        target_term=target_schema_term
    )

