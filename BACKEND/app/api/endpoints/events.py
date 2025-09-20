from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import DiagnosisEvent
from app.core.security import get_current_principal

router = APIRouter()

class DiagnosisEventPayload(BaseModel):
    # Who performed the action (optional for now)
    doctor_id: Optional[str] = Field(default=None)
    # Traditional system context
    system: str = Field(description="ayurveda | siddha | unani")
    code: Optional[str] = None
    term_name: Optional[str] = None
    # The ICD-11 disease name associated with the action (required)
    icd_name: str
    # Geo metadata (required for map)
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: float
    longitude: float

    @validator("system")
    def validate_system(cls, v: str):
        vv = (v or "").strip().lower()
        if vv not in ("ayurveda", "siddha", "unani"):
            raise ValueError("system must be one of ayurveda|siddha|unani")
        return vv

    @validator("latitude", "longitude")
    def validate_geo(cls, v: float):
        if v is None:
            raise ValueError("latitude/longitude required")
        return v

@router.post("/diagnosis")
def log_diagnosis_event(payload: DiagnosisEventPayload, db: Session = Depends(get_db), principal=Depends(get_current_principal)):
    try:
        evt = DiagnosisEvent(
            doctor_id=payload.doctor_id,
            system=payload.system,
            code=payload.code,
            term_name=payload.term_name,
            icd_name=payload.icd_name,
            city=payload.city,
            state=payload.state,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        db.add(evt)
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log event: {e}")
