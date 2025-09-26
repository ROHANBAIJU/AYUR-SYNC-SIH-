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
    # --- New TM2 enrichment fields (optional, populated when TM2 data discovered) ---
    tm2_code = Column(String(50))
    tm2_title = Column(Text)
    tm2_definition = Column(Text)
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
    # ICD code actually used (after WHO enrichment) and optional TM2 code captured for analytics
    icd_code_used = Column(String(50))
    tm2_code = Column(String(50))
    # Optional patient identifier (hashed / pseudonymous acceptable)
    patient_id = Column(String(100))
    # Release version (ConceptMapRelease.version) used at time of capture for reproducibility
    release_version = Column(String(50))
    # Optional locality metadata
    city = Column(String(100))
    state = Column(String(100))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

# --- New Tables for Hackathon Versioning & Governance Layer ---

class ConceptMapRelease(Base):
    """Immutable snapshot of verified mappings at a point in time."""
    __tablename__ = "concept_map_releases"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, index=True, default="namaste-to-icd11")
    version = Column(String(50), nullable=False, unique=True, index=True)  # e.g. v1-submission
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    published_at = Column(TIMESTAMP(timezone=True))  # optional publish marker

class ConceptMapElement(Base):
    """Individual mapping element captured inside a release."""
    __tablename__ = "concept_map_elements"
    id = Column(Integer, primary_key=True)
    release_id = Column(Integer, ForeignKey("concept_map_releases.id", ondelete="CASCADE"), index=True, nullable=False)
    icd_name = Column(String(255), index=True, nullable=False)
    icd_code = Column(String(50))
    system = Column(String(50), nullable=False)  # ayurveda|siddha|unani
    term = Column(String(255), nullable=False)
    equivalence = Column(String(30), nullable=False, server_default='equivalent')
    is_primary = Column(Boolean, nullable=False, server_default='f')
    active = Column(Boolean, nullable=False, server_default='t')
    # future: justification, provenance link

class MappingAudit(Base):
    """Simple audit trail for curation actions."""
    __tablename__ = "mapping_audit"
    id = Column(Integer, primary_key=True)
    mapping_id = Column(Integer, ForeignKey("mappings.id", ondelete="CASCADE"), index=True)
    action = Column(String(50), nullable=False)  # verify|reject|modify
    actor = Column(String(100))
    reason = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Consent(Base):
    """Consent stub (global or subject-specific)."""
    __tablename__ = "consents"
    id = Column(Integer, primary_key=True)
    subject_hash = Column(String(128), index=True)  # '*' for global
    # Scope/purpose fields extended for finer grained enforcement
    purpose = Column(String(50), nullable=False, default='translation')  # legacy field (kept)
    scope = Column(String(100), nullable=False, server_default='terminology')  # e.g., terminology, bundle.ingest
    status = Column(String(30), nullable=False, default='active')  # active|revoked|expired
    valid_from = Column(TIMESTAMP(timezone=True), server_default=func.now())
    valid_to = Column(TIMESTAMP(timezone=True))
    patient_id = Column(String(100), index=True)  # explicit patient reference if available
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class ExternalCodeLink(Base):
    """Minimal external semantic linkage (e.g., SNOMED / LOINC placeholder)."""
    __tablename__ = 'external_code_links'
    id = Column(Integer, primary_key=True)
    system = Column(String(50), nullable=False)  # snomed|loinc
    source_type = Column(String(50), nullable=False)  # icd11|namaste
    source_code = Column(String(100), nullable=False, index=True)
    external_code = Column(String(100), nullable=False)
    display = Column(String(255))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())