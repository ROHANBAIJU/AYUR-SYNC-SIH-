from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.db.session import get_db
from app.db.models import Mapping, ConceptMapRelease, ConceptMapElement, MappingAudit

router = APIRouter(tags=["Status"]) 

@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    total = db.query(func.count(Mapping.id)).scalar() or 0
    verified = db.query(func.count(Mapping.id)).filter(Mapping.status == 'verified').scalar() or 0
    release = db.query(ConceptMapRelease).order_by(ConceptMapRelease.created_at.desc()).first()
    release_version = release.version if release else None
    elements = 0
    if release:
        elements = db.query(func.count(ConceptMapElement.id)).filter(ConceptMapElement.release_id == release.id).scalar() or 0
    audits = db.query(func.count(MappingAudit.id)).scalar() or 0
    return {
        "total_mappings": total,
        "verified_mappings": verified,
        "verified_pct": (verified/total*100) if total else 0,
        "current_release": release_version,
        "release_elements": elements,
        "audit_events": audits
    }
