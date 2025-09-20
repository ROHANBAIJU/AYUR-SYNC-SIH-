from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import Mapping, TraditionalTerm, ICD11Code
from app.core.security import get_current_principal

router = APIRouter()


# ---- Helpers ----

SYSTEM_URI_BASE = "https://ayur-sync.example/fhir/CodeSystem/"
ICD11_SYSTEM_URI = "http://id.who.int/icd/release/11/mms"
TM2_SYSTEM_URI = "http://id.who.int/icd/release/11/tm2"  # informational only


def system_param_to_key(system_param: str) -> str:
    # Accept both bare keys (ayurveda) and full URIs
    if system_param.startswith("http://") or system_param.startswith("https://"):
        # Expect the trailing segment as system key
        return system_param.rstrip("/").split("/")[-1].lower()
    return system_param.lower()


def system_key_to_uri(system_key: str) -> str:
    return f"{SYSTEM_URI_BASE}{system_key}"


def pick_vernacular(t: TraditionalTerm) -> Optional[str]:
    return t.devanagari or t.tamil or t.arabic


def append_audit_log(action: str, principal: Dict[str, Any], detail: Dict[str, Any]):
    try:
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "principal": principal,
            "detail": detail,
        }
        # Lightweight JSONL audit log; in production route this to a DB or SIEM.
        with open("/app/logs/access.log", "a", encoding="utf-8") as f:
            import json
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        # Best-effort only
        pass


# ---- FHIR CapabilityStatement ----


@router.get("/metadata")
def capability_statement(principal: Dict[str, Any] = Depends(get_current_principal)):
    """Minimal CapabilityStatement advertising supported interactions."""
    append_audit_log("fhir.metadata", principal, {})
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": datetime.now(timezone.utc).date().isoformat(),
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "rest": [
            {
                "mode": "server",
                "security": {
                    "cors": True,
                    "service": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/restful-security-service", "code": "OAuth"}], "text": "ABHA OAuth/Bearer"}],
                },
                "resource": [
                    {
                        "type": "CodeSystem",
                        "interaction": [{"code": "read"}],
                        "operation": [
                            {"name": "lookup", "definition": "http://hl7.org/fhir/OperationDefinition/CodeSystem-lookup"}
                        ],
                    },
                    {
                        "type": "ValueSet",
                        "operation": [
                            {"name": "expand", "definition": "http://hl7.org/fhir/OperationDefinition/ValueSet-expand"}
                        ],
                    },
                    {
                        "type": "ConceptMap",
                        "operation": [
                            {"name": "translate", "definition": "http://hl7.org/fhir/OperationDefinition/ConceptMap-translate"}
                        ],
                    },
                ],
            }
        ],
    }


# ---- CodeSystem read ----


@router.get("/CodeSystem/{system_key}")
def get_code_system(
    system_key: str,
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system_key)
    if key not in {"ayurveda", "siddha", "unani"}:
        raise HTTPException(status_code=404, detail="Unknown CodeSystem")
    count = (
        db.query(TraditionalTerm)
        .join(Mapping)
        .filter(TraditionalTerm.system == key, Mapping.status == "verified")
        .distinct(TraditionalTerm.id)
        .count()
    )
    resource = {
        "resourceType": "CodeSystem",
        "id": key,
        "url": system_key_to_uri(key),
        "version": "1.0.0",
        "name": f"NAMASTE-{key.title()}",
        "status": "active",
        "content": "not-present",  # we don't inline concepts
        "count": count,
    }
    append_audit_log("fhir.codesystem.read", principal, {"system": key})
    return resource


# ---- CodeSystem $lookup ----


@router.get("/CodeSystem/$lookup")
def codesystem_lookup(
    system: str = Query(..., description="CodeSystem URL or key (ayurveda|siddha|unani)"),
    code: str = Query(..., description="Code to look up (NAMASTE code)"),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system)
    term = (
        db.query(TraditionalTerm)
        .filter(TraditionalTerm.system == key, TraditionalTerm.code == code)
        .first()
    )
    if not term:
        raise HTTPException(status_code=404, detail="Concept not found")
    # Build FHIR Parameters per OperationOutcome for lookup
    params = {
        "resourceType": "Parameters",
        "parameter": [
            {"name": "name", "valueString": term.term},
            {"name": "version", "valueString": "1.0.0"},
            {"name": "display", "valueString": term.term},
            {
                "name": "property",
                "part": [
                    {"name": "code", "valueCode": "short"},
                    {"name": "valueString", "valueString": term.source_short_definition or ""},
                ],
            },
            {
                "name": "property",
                "part": [
                    {"name": "code", "valueCode": "long"},
                    {"name": "valueString", "valueString": term.source_long_definition or ""},
                ],
            },
        ],
    }
    vern = pick_vernacular(term)
    if vern:
        params["parameter"].append(
            {
                "name": "designation",
                "part": [
                    {"name": "value", "valueString": vern},
                ],
            }
        )
    append_audit_log("fhir.codesystem.lookup", principal, {"system": key, "code": code})
    return params


# ---- ValueSet $expand ----


@router.get("/ValueSet/$expand")
def valueset_expand(
    system: str = Query(..., description="CodeSystem URL or key (ayurveda|siddha|unani)"),
    filter: Optional[str] = Query(None, min_length=2, description="Text filter against term/description"),
    count: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system)
    q = (
        db.query(TraditionalTerm)
        .join(Mapping)
        .filter(TraditionalTerm.system == key, Mapping.status == "verified")
    )
    if filter:
        from sqlalchemy import or_

        like = f"%{filter.lower()}%"
        q = q.filter(
            or_(
                TraditionalTerm.term.ilike(like),
                TraditionalTerm.source_description.ilike(like),
                TraditionalTerm.source_short_definition.ilike(like),
                TraditionalTerm.source_long_definition.ilike(like),
            )
        )
    q = q.distinct(TraditionalTerm.id).limit(count)
    items: List[TraditionalTerm] = q.all()
    contains = []
    for t in items:
        contains.append(
            {
                "system": system_key_to_uri(key),
                "code": t.code or t.term,
                "display": t.term,
                "designation": ([{"value": pick_vernacular(t)}] if pick_vernacular(t) else []),
            }
        )
    resource = {
        "resourceType": "ValueSet",
        "status": "active",
        "compose": {"include": [{"system": system_key_to_uri(key)}]},
        "expansion": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total": len(contains),
            "contains": contains,
        },
    }
    append_audit_log("fhir.valueset.expand", principal, {"system": key, "filter": filter or ""})
    return resource


# ---- ConceptMap $translate ----


@router.get("/ConceptMap/$translate")
def conceptmap_translate(
    system: str = Query(..., description="Source CodeSystem URL or key (ayurveda|siddha|unani)"),
    code: str = Query(..., description="Source code (NAMASTE)"),
    target: Optional[str] = Query(None, description="Optional target system URI (defaults to ICD-11 MMS)"),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system)
    target_uri = target or ICD11_SYSTEM_URI
    # Find verified primary mapping for given source
    mapping = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .options(joinedload(Mapping.icd11_code), joinedload(Mapping.traditional_term))
        .filter(
            TraditionalTerm.system == key,
            TraditionalTerm.code == code,
            Mapping.status == "verified",
            Mapping.is_primary == True,
        )
        .first()
    )
    if not mapping:
        # FHIR response for no match
        params = {
            "resourceType": "Parameters",
            "parameter": [
                {"name": "result", "valueBoolean": False},
                {"name": "message", "valueString": "No verified primary mapping found"},
            ],
        }
        append_audit_log("fhir.conceptmap.translate", principal, {"system": key, "code": code, "result": False})
        return params
    icd = mapping.icd11_code
    match_part = [
        {"name": "equivalence", "valueCode": "equivalent"},
        {
            "name": "concept",
            "valueCoding": {
                "system": target_uri,
                "code": icd.icd_code or icd.icd_name,
                "display": icd.icd_name,
            },
        },
    ]
    # Include source details as well
    match_part.append(
        {
            "name": "source",
            "valueCoding": {
                "system": system_key_to_uri(key),
                "code": mapping.traditional_term.code or mapping.traditional_term.term,
                "display": mapping.traditional_term.term,
            },
        }
    )
    params = {
        "resourceType": "Parameters",
        "parameter": [
            {"name": "result", "valueBoolean": True},
            {"name": "match", "part": match_part},
        ],
    }
    append_audit_log("fhir.conceptmap.translate", principal, {"system": key, "code": code, "result": True})
    return params
