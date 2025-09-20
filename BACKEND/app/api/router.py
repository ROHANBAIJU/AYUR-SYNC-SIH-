# File: app/api/router.py
# This file acts as the main router, consolidating all the specific endpoint
# routers from the 'endpoints' directory into a single APIRouter.

from fastapi import APIRouter
from app.api.endpoints import token, admin, lookup, translate, fhir, events

# Create the main router instance
api_router = APIRouter()

# Include each of the endpoint routers
api_router.include_router(token.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Panel"])
api_router.include_router(lookup.router, prefix="/public", tags=["Public EMR Endpoints"])
api_router.include_router(translate.router, prefix="/public", tags=["Public EMR Endpoints"])
api_router.include_router(fhir.router, prefix="/fhir", tags=["FHIR"])
api_router.include_router(events.router, prefix="/public", tags=["Public EMR Endpoints"])
