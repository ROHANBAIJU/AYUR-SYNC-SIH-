# File: app/schemas/mapping.py
# This file defines the Pydantic models (schemas) for data validation
# related to the mapping data.

from pydantic import BaseModel
from typing import Optional

class MappingBase(BaseModel):
    """
    Base schema for a mapping row, representing the data sent to and from the API.
    """
    suggested_icd_name: str
    ayurveda_term: Optional[str] = None
    ayurveda_details: Optional[str] = None
    siddha_term: Optional[str] = None
    siddha_details: Optional[str] = None
    unani_term: Optional[str] = None
    unani_details: Optional[str] = None

class MappingCuration(BaseModel):
    """
    Schema for submitting a single verified or rejected mapping from the admin panel.
    """
    suggested_icd_name: str
    system: str # 'ayurveda', 'siddha', or 'unani'
    term: str
    details: str
    status: str # 'verified' or 'rejected'
    justification: Optional[str] = None # Optional field for rejection reason
