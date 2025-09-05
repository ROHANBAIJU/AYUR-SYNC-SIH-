# src/db/models.py

from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import declarative_base

# declarative_base() is the standard starting point for SQLAlchemy models.
Base = declarative_base()

class Terminology(Base):
    """
    SQLAlchemy model for the 'terminologies' table.
    This table acts as our main dictionary for all codes and their terms.
    """
    __tablename__ = "terminologies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    term = Column(String, nullable=False)
    
    # NEW: Add columns for the rich clinical data.
    # We use Text instead of String for potentially long descriptions.
    definition = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)


class ConceptMap(Base):
    """
    SQLAlchemy model for the 'concept_maps' table.
    This table stores the explicit relationships between different terminology codes.
    It's our dedicated "translator's dictionary".
    """
    __tablename__ = "concept_maps"

    id = Column(Integer, primary_key=True, index=True)
    
    # The code we are translating FROM (e.g., 'ASU25.14')
    source_code = Column(String, ForeignKey("terminologies.code"), nullable=False)
    
    # The code we are translating TO (e.g., 'ICD11-M54.3')
    target_code = Column(String, ForeignKey("terminologies.code"), nullable=False)

    # A field to describe the relationship, e.g., 'exact-match', 'broader', 'narrower'.
    # This makes our map much smarter for the future.
    relationship = Column(String, default="exact-match", nullable=False)

