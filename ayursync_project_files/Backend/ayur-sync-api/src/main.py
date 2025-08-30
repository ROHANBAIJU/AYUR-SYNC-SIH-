# src/main.py

from fastapi import FastAPI
from src.api.router import api_router # CORRECTED IMPORT

# Create an instance of the FastAPI class
app = FastAPI(
    title="AYUR-SYNC API",
    version="0.1.0",
    description="A FHIR-compliant terminology microservice for NAMASTE and ICD-11.",
)

# Include the main API router.
# All our endpoints from api/router.py will now be available under this prefix.
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    """
    Root endpoint for the API.
    Provides a simple welcome message and status check.
    """
    return {"status": "ok", "message": "Welcome to the AYUR-SYNC API"}

