from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.db.session import get_db
from app.db.models import Mapping, ConceptMapRelease, ConceptMapElement, MappingAudit, IngestionBatch, IngestionRow

router = APIRouter(tags=["Status"]) 

@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    total = db.query(func.count(Mapping.id)).scalar() or 0
    verified = db.query(func.count(Mapping.id)).filter(Mapping.status == 'verified').scalar() or 0
    suggested = db.query(func.count(Mapping.id)).filter(Mapping.status == 'suggested').scalar() or 0
    staged = db.query(func.count(Mapping.id)).filter(Mapping.status == 'staged').scalar() or 0
    release = db.query(ConceptMapRelease).order_by(ConceptMapRelease.created_at.desc()).first()
    release_version = release.version if release else None
    elements = 0
    if release:
        elements = db.query(func.count(ConceptMapElement.id)).filter(ConceptMapElement.release_id == release.id).scalar() or 0
    audits = db.query(func.count(MappingAudit.id)).scalar() or 0
    batches = db.query(func.count(IngestionBatch.id)).scalar() or 0
    pending_rows = db.query(func.count(IngestionRow.id)).filter(IngestionRow.status == 'pending').scalar() or 0
    promoted_rows = db.query(func.count(IngestionRow.id)).filter(IngestionRow.status == 'promoted').scalar() or 0
    rejected_rows = db.query(func.count(IngestionRow.id)).filter(IngestionRow.status == 'rejected').scalar() or 0
    return {
        "total_mappings": total,
        "verified_mappings": verified,
        "verified_pct": (verified/total*100) if total else 0,
        "suggested_mappings": suggested,
        "staged_mappings": staged,
        "current_release": release_version,
        "release_elements": elements,
        "audit_events": audits,
        "ingest_batches": batches,
        "ingest_rows_pending": pending_rows,
        "ingest_rows_promoted": promoted_rows,
        "ingest_rows_rejected": rejected_rows
    }
