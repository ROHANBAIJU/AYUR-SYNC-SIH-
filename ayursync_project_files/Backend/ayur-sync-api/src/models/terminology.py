# src/models/terminology.py

from pydantic import BaseModel, Field
from typing import Optional

class Terminology(BaseModel):
    """
    Represents a single terminology entry from the database.
    """
    code: str = Field(..., example="ASU25.14", description="The unique code for the term.")
    term: str = Field(..., example="Gridhrasi", description="The display name of the term.")
    definition: Optional[str] = Field(None, example="A Vata disorder affecting the lower back...", description="The clinical definition of the term.")
    symptoms: Optional[str] = Field(None, example="Shooting pain, stiffness", description="Common symptoms associated with the term.")

    class Config:
        from_attributes = True

class ConceptMapping(BaseModel):
    """
    Represents a single mapping from a source code to a target code.
    """
    source_code: str
    source_term: str
    target_code: str
    target_term: str

class TranslationResult(BaseModel):
    """
    The structured response for a translation request.
    """
    found: bool
    source_term: Optional[Terminology] = None
    target_term: Optional[Terminology] = None

# --- NEW MODEL FOR FHIR BUNDLE ---
class FHIRBundle(BaseModel):
    """
    Represents the basic structure of a FHIR Bundle.
    We accept a generic dictionary and do not validate the deep internal FHIR structure,
    as that will be the job of a dedicated FHIR server.
    """
    resourceType: str = Field(..., example="Bundle")
    type: str = Field(..., example="transaction")
    entry: list = Field(..., description="A list of FHIR resources within the bundle.")

