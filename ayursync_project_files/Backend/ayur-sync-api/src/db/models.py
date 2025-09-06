# src/db/models.py

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import declarative_base

#from src.db.base import Base
# declarative_base() is the standard starting point for SQLAlchemy models.
Base = declarative_base()
class Terminology(Base):
    """
    SQLAlchemy model for the 'terminologies' table.
    This table is the master dictionary for all clinical terms from all systems.
    It now includes a 'concept_name' to group related terms together.
    """
    __tablename__ = "terminologies"

    id = Column(Integer, primary_key=True, index=True)
    
    # NEW: A common name to link all related terms (e.g., "Migraine")
    concept_name = Column(String, index=True, nullable=False)
    
    code = Column(String, unique=True, index=True, nullable=False)
    term = Column(String, index=True, nullable=False)
    system = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)

