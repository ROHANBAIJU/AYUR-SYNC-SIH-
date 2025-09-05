# src/api/router.py

from fastapi import APIRouter
from src.api.endpoints import terminology, auth, encounters # Add 'encounters'

# This is the main router that combines all the other specific routers.
api_router = APIRouter()

# Include the terminology router with a specific prefix and tag
# CORRECTED: Changed terminology.router to terminology.terminology_router
api_router.include_router(terminology.terminology_router, prefix="/terminology", tags=["Terminology"])

# Include the new authentication router
api_router.include_router(auth.auth_router, prefix="/auth", tags=["Authentication"])

# Include the new encounter router (for uploading data)
api_router.include_router(encounters.encounter_router, prefix="/encounters", tags=["Encounters"])