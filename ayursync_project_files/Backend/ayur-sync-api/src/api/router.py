# src/api/router.py

from fastapi import APIRouter
from .endpoints import terminology

# This is our main API router.
api_router = APIRouter()

# Include the router from our terminology endpoint file.
# Any endpoint defined in `terminology.py` will now be part of this main router.
# We add a prefix and a tag for organization.
api_router.include_router(terminology.router, prefix="/terminology", tags=["Terminology"])
