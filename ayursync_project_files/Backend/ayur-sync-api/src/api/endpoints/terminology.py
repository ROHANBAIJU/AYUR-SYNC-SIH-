# src/api/endpoints/terminology.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.services import terminology_service, concept_map_service
from src.models.terminology import Terminology, TranslationResult
from src.core.security import get_current_user_from_token

# This router handles all endpoints related to terminology lookup and translation.
terminology_router = APIRouter()

@terminology_router.get(
    "/lookup",
    response_model=list[Terminology],
    summary="Search for terminology terms",
    description="Performs a case-insensitive search for terminology terms matching the filter string."
)
async def lookup_terms(
    filter: str = Query(..., min_length=3, description="The search string to filter terms by."),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token) # This endpoint is now protected
):
    """
    Looks up terminology terms based on a filter string.
    Requires a valid JWT token.
    """
    terms = terminology_service.find_terms_by_filter(db=db, filter_str=filter)
    if not terms:
        raise HTTPException(status_code=404, detail="No terms found matching the filter.")
    return terms


@terminology_router.get(
    "/translate",
    response_model=TranslationResult,
    summary="Translate a terminology code",
    description="Translates a source terminology code (e.g., NAMASTE) to its corresponding target code (e.g., ICD-11)."
)
async def translate_term(
    code: str = Query(..., description="The source code to translate."),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token) # This endpoint is now protected
):
    """
    Translates a single code from a source system to a target system.
    Requires a valid JWT token.
    """
    # CORRECTED: Changed 'source_code=code' to 'code=code' to match the function definition.
    translation = concept_map_service.translate_code(db=db, code=code)
    if not translation.found:
        raise HTTPException(status_code=404, detail=f"No translation found for code '{code}'.")
    return translation

