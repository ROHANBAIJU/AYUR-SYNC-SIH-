from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models import DiagnosisEvent
from app.core.security import get_current_principal

router = APIRouter(prefix="/analytics", tags=["analytics"]) 

@router.get("/morbidity/top")
def top_morbidity(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(DiagnosisEvent.icd_name, func.count(DiagnosisEvent.id).label('c'))
        .filter(DiagnosisEvent.created_at >= cutoff)
        .group_by(DiagnosisEvent.icd_name)
        .order_by(func.count(DiagnosisEvent.id).desc())
        .limit(limit)
        .all()
    )
    return {"window_days": days, "limit": limit, "items": [{"icd_name": r[0], "count": r[1]} for r in rows]}

@router.get("/dual-coding/coverage")
def dual_coding_coverage(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    q = db.query(DiagnosisEvent).filter(DiagnosisEvent.created_at >= cutoff)
    total = q.count()
    both = q.filter(DiagnosisEvent.icd_code_used.isnot(None), DiagnosisEvent.code.isnot(None)).count()
    tm_only = q.filter(DiagnosisEvent.code.isnot(None), DiagnosisEvent.icd_code_used.is_(None)).count()
    icd_only = q.filter(DiagnosisEvent.icd_code_used.isnot(None), DiagnosisEvent.code.is_(None)).count()
    return {
        "window_days": days,
        "total": total,
        "both_coded": both,
        "tm_only": tm_only,
        "icd_only": icd_only,
        "coverage_percent": (both / total * 100.0) if total else 0.0
    }
