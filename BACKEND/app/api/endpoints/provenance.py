from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timezone
from typing import Optional

from app.db.session import get_db
from app.db import models

router = APIRouter(prefix="/provenance", tags=["Provenance"]) 

@router.get("/conceptmap")
def provenance_for_mapping(
    icd_name: str = Query(..., description="ICD name to inspect"),
    system: Optional[str] = Query(None, description="Filter by traditional system (ayurveda|siddha|unani)"),
    db: Session = Depends(get_db)
):
    # Find latest release and one element for the given icd_name (+ optional system)
    rel = db.execute(select(models.ConceptMapRelease).order_by(models.ConceptMapRelease.created_at.desc())).scalar_one_or_none()
    if not rel:
        raise HTTPException(404, "No ConceptMap release found")
    # Case-insensitive icd_name match
    stmt = select(models.ConceptMapElement).where(
        models.ConceptMapElement.release_id == rel.id,
        func.lower(models.ConceptMapElement.icd_name) == icd_name.lower()
    )
    if system:
        stmt = stmt.where(models.ConceptMapElement.system == system.lower())
    element = db.execute(stmt).scalars().first()
    if not element:
        raise HTTPException(404, "No mapping element found for that ICD (and system filter)")

    # Latest audit for any mapping that matches icd + term (best-effort)
    audit = db.execute(select(models.MappingAudit) \
        .join(models.Mapping, models.Mapping.id == models.MappingAudit.mapping_id) \
        .join(models.ICD11Code, models.Mapping.icd11_code_id == models.ICD11Code.id) \
        .join(models.TraditionalTerm, models.Mapping.traditional_term_id == models.TraditionalTerm.id) \
        .where(func.lower(models.ICD11Code.icd_name) == icd_name.lower(), models.TraditionalTerm.term == element.term) \
        .order_by(models.MappingAudit.created_at.desc()) \
        .limit(1)).scalars().first()

    actor_display = getattr(audit, 'actor', None) or 'unknown'
    provenance = {
        "resourceType": "Provenance",
        "id": f"prov-{element.id}",
        "recorded": datetime.now(timezone.utc).isoformat(),
        "target": [
            {"reference": f"ConceptMap/namaste-to-icd11|{rel.version}"}
        ],
        "activity": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "MAP"}]},
        "agent": [
            {"type": {"text": "curator"}, "who": {"display": actor_display} }
        ],
        "entity": [
            {"role": "source", "what": {"display": element.term, "extension": [
                {"url": "https://ayur-sync.example/fhir/StructureDefinition/system", "valueString": element.system},
                {"url": "https://ayur-sync.example/fhir/StructureDefinition/icdName", "valueString": element.icd_name}
            ]}}
        ]
    }
    if audit and audit.reason:
        provenance["reason"] = [{"text": audit.reason}]
    return provenance
