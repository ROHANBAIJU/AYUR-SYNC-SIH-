from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
from app.db.session import get_db
from app.db.models import ExternalCodeLink
from app.core.security import get_current_principal

router = APIRouter(prefix="/external", tags=["External Semantics"]) 

@router.get("/links")
def list_links(
    system: Optional[str] = Query(None, description="External system (snomed|loinc)"),
    source_type: Optional[str] = Query(None, description="Source type (icd11|namaste)"),
    code: Optional[str] = Query(None, description="Filter by source code fragment"),
    db: Session = Depends(get_db),
    principal = Depends(get_current_principal)
):
    stmt = select(ExternalCodeLink)
    if system:
        stmt = stmt.where(ExternalCodeLink.system == system.lower())
    if source_type:
        stmt = stmt.where(ExternalCodeLink.source_type == source_type.lower())
    if code:
        stmt = stmt.where(ExternalCodeLink.source_code.ilike(f"%{code}%"))
    rows = db.execute(stmt).scalars().all()
    return {"count": len(rows), "items": [
        {
            "system": r.system,
            "source_type": r.source_type,
            "source_code": r.source_code,
            "external_code": r.external_code,
            "display": r.display
        } for r in rows
    ]}
