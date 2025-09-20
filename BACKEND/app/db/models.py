# FILE: app/db/models.py

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, TIMESTAMP, Float
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class ICD11Code(Base):
    __tablename__ = "icd11_codes"
    id = Column(Integer, primary_key=True, index=True)
    icd_name = Column(String(255), unique=True, nullable=False, index=True)
    # WHO linearized ICD code (e.g., ME01). Nullable until enriched via WHO.
    icd_code = Column(String(50))
    description = Column(Text)
    status = Column(String(50), nullable=False, server_default='Orphaned')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    mappings = relationship("Mapping", back_populates="icd11_code")

class TraditionalTerm(Base):
    __tablename__ = "traditional_terms"
    id = Column(Integer, primary_key=True, index=True)
    system = Column(String(50), nullable=False)
    term = Column(String(255), nullable=False)
    code = Column(String(100))
    # New: Store short and long definitions from the source files separately
    source_short_definition = Column(Text)
    source_long_definition = Column(Text)
    source_description = Column(Text)
    devanagari = Column(Text)
    tamil = Column(Text)
    arabic = Column(Text)
    source_row = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    mappings = relationship("Mapping", back_populates="traditional_term")

class Mapping(Base):
    __tablename__ = "mappings"
    id = Column(Integer, primary_key=True, index=True)
    icd11_code_id = Column(Integer, ForeignKey("icd11_codes.id", ondelete="CASCADE"), nullable=False)
    traditional_term_id = Column(Integer, ForeignKey("traditional_terms.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False, server_default='suggested')
    is_primary = Column(Boolean, nullable=False, server_default='f')
    ai_justification = Column(Text)
    ai_confidence = Column(Integer)
    curated_at = Column(TIMESTAMP(timezone=True))
    
    icd11_code = relationship("ICD11Code", back_populates="mappings")
    traditional_term = relationship("TraditionalTerm", back_populates="mappings")


class DiagnosisEvent(Base):
    __tablename__ = "diagnosis_events"
    id = Column(Integer, primary_key=True, index=True)
    # Optional clinician identifier if available from the EMR; stored as text to avoid FK coupling
    doctor_id = Column(String(100))
    # Traditional medicine system and fields
    system = Column(String(50), nullable=False)
    code = Column(String(100))
    term_name = Column(String(255))
    # ICD disease name associated with the action
    icd_name = Column(String(255), nullable=False)
    # Optional locality metadata
    city = Column(String(100))
    state = Column(String(100))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())