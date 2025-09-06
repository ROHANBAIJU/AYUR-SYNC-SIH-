# src/models/terminology.py

from pydantic import BaseModel, Field
from typing import Optional, List

class TerminologyRepresentation(BaseModel):
    """
    Represents a single clinical term from one medical system.
    This is a sub-model for our final unified response.
    """
    system: str = Field(..., example="Ayurveda", description="The medical system this term belongs to.")
    code: str = Field(..., example="ASU.DI.01", description="The unique code for the term within its system.")
    term: str = Field(..., example="Ardhavabhedaka", description="The display name of the term.")
    description: Optional[str] = Field(None, example="A severe, unilateral...", description="The clinical definition of the term.")
    symptoms: Optional[str] = Field(None, example="Unilateral headache...", description="Common symptoms associated with the term.")

    class Config:
        from_attributes = True

class UnifiedConceptResponse(BaseModel):
    """
    The main response model for our intelligent API.
    It provides a complete, 360-degree view of a single clinical concept.
    """
    concept_name: str = Field(..., example="Migraine", description="The unified, common name for the clinical concept.")
    representations: List[TerminologyRepresentation] = Field(..., description="A list of how this concept is represented across different medical systems.")


# --- LEGACY AND UTILITY MODELS ---
class Terminology(BaseModel):
    """
    A simple model for basic terminology lookups.
    """
    code: str
    term: str

    class Config:
        from_attributes = True

class FHIRBundle(BaseModel):
    """
    Represents the basic structure of a FHIR Bundle.
    """
    resourceType: str = Field(..., example="Bundle")
    type: str = Field(..., example="transaction")
    entry: list = Field(..., description="A list of FHIR resources within the bundle.")

