# src/api/endpoints/terminology.py

from fastapi import APIRouter, Query
from typing import List

# CORRECTED IMPORTS
from src.services.terminology_service import terminology_service
from src.models.terminology import Terminology

# APIRouter helps organize endpoints into separate files.
router = APIRouter()

@router.get("/lookup", response_model=List[Terminology])
def search_terminology(
    filter: str = Query(
        ..., 
        min_length=2,
        description="The search filter string to apply to terminology terms.",
        example="Kasa"
    )
):
    """
    Performs a lookup for terminology terms based on a filter string.
    
    This endpoint provides a simple text search against the 'term' field
    of the loaded terminologies. It implements the core auto-complete functionality.
    """
    # The endpoint's job is simple: call the service and return the result.
    # FastAPI will automatically convert the result to JSON.
    return terminology_service.search_terms(query=filter)

