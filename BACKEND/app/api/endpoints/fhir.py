from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.db.session import get_db
from app.db.models import Mapping, TraditionalTerm, ICD11Code
from app.core.security import get_current_principal
from app.util.fhir_outcome import outcome_not_found, outcome_validation, outcome_error

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


# ---- CodeSystem $lookup (declare BEFORE dynamic read route to avoid shadowing) ----


@router.get("/CodeSystem/$lookup")
def codesystem_lookup(
    system: str = Query(..., description="CodeSystem URL or key (ayurveda|siddha|unani)"),
    code: str = Query(..., description="Code to look up (NAMASTE code)"),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system)
    if key not in {"ayurveda", "siddha", "unani"}:
        return outcome_not_found("Unknown CodeSystem")
    term = (
        db.query(TraditionalTerm)
        .filter(TraditionalTerm.system == key, TraditionalTerm.code == code)
        .first()
    )
    if not term:
        return outcome_not_found("Concept not found")
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


# ---- CodeSystem read ----


@router.get("/CodeSystem/{system_key}")
def get_code_system(
    system_key: str,
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system_key)
    if key not in {"ayurveda", "siddha", "unani"}:
        return outcome_not_found("Unknown CodeSystem")
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


# ---- Bundle Ingest (Stub) ----

@router.post("/Bundle")
def ingest_bundle(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    """Prototype Bundle ingest.

    Accepts a JSON body representing a simplified FHIR Bundle:
    {
      "resourceType": "Bundle",
      "type": "collection",
      "entry": [{"resource": {"resourceType": "Condition", ...}}, ...]
    }

    Classifies each Condition as valid / mismatch / unknown based on:
    - NAMASTE (source) term -> verified ICD mapping presence
    - Provided ICD code/display alignment with stored ICD name
    Returns an OperationOutcome-like summary structure.
    """
    if payload.get("resourceType") != "Bundle":
        raise HTTPException(400, "Expected Bundle resourceType")
    entries = payload.get("entry") or []
    total = 0
    valid = 0
    mismatched = 0
    unknown = 0
    details: List[Dict[str, Any]] = []
    for e in entries:
        res = (e or {}).get("resource") or {}
        if res.get("resourceType") != "Condition":
            continue
        total += 1
        coding = ((res.get("code") or {}).get("coding") or [])
        namaste_code = None
        icd_display = None
        icd_code_val = None
        for c in coding:
            sys = c.get("system")
            if not sys: continue
            if sys.endswith("/ayurveda") or sys.endswith("/siddha") or sys.endswith("/unani"):
                namaste_code = c.get("code")
            if sys.startswith("http://id.who.int/icd"):
                icd_code_val = c.get("code")
                icd_display = c.get("display")
        if not namaste_code:
            unknown += 1
            details.append({"status": "unknown", "reason": "No NAMASTE code", "condition": res.get("id")})
            continue
        # Find mapping by NAMASTE code among verified primaries
        mapping = (
            db.query(Mapping)
            .join(TraditionalTerm)
            .join(ICD11Code)
            .filter(TraditionalTerm.code == namaste_code, Mapping.status == 'verified', Mapping.is_primary == True)
            .first()
        )
        if not mapping:
            unknown += 1
            details.append({"status": "unknown", "namaste_code": namaste_code, "reason": "No verified primary mapping"})
            continue
        icd_obj = mapping.icd11_code
        expected_code_or_name = icd_obj.icd_code or icd_obj.icd_name
        # Simple mismatch detection: provided ICD display/code differs
        if icd_code_val and icd_code_val != expected_code_or_name:
            mismatched += 1
            details.append({
                "status": "mismatch",
                "namaste_code": namaste_code,
                "provided_icd": icd_code_val,
                "expected_icd": expected_code_or_name
            })
            continue
        # All good
        valid += 1
        details.append({
            "status": "valid",
            "namaste_code": namaste_code,
            "icd": expected_code_or_name
        })
    summary = {
        "resourceType": "OperationOutcome",
        "issue": [
            {"severity": "information", "code": "informational", "details": {"text": f"Processed {total} Conditions"}},
            {"severity": "information", "code": "informational", "details": {"text": f"valid={valid} mismatched={mismatched} unknown={unknown}"}},
        ],
        "extension": [
            {"url": "https://ayur-sync.example/structure/BundleIngestSummary", "valueString": "|".join([f"total:{total}", f"valid:{valid}", f"mismatched:{mismatched}", f"unknown:{unknown}"])}
        ],
        "contained": [{"resourceType": "Basic", "id": "details", "extension": [
            {"url": "details", "valueString": ";".join([d.get('status','') for d in details])}
        ]}]
    }
    return {"summary": summary, "details": details}


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
    code: str = Query(..., description="Source code (NAMASTE) OR (fallback) the term itself"),
    target: Optional[str] = Query(None, description="Optional target system URI (defaults to ICD-11 MMS)"),
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_current_principal),
):
    key = system_param_to_key(system)
    target_uri = target or ICD11_SYSTEM_URI
    # Find verified primary mapping for given source.
    # Fallback: if no term has that code, allow passing the raw term (useful before codes are curated).
    mapping = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .options(joinedload(Mapping.icd11_code), joinedload(Mapping.traditional_term))
        .filter(
            TraditionalTerm.system == key,
            Mapping.status == "verified",
            Mapping.is_primary == True,
            or_(TraditionalTerm.code == code, TraditionalTerm.term == code)
        )
        .first()
    )
    fallback_used = False
    if not mapping:
        # Option C: fallback to ANY verified mapping (prefer primary if one exists; otherwise first by id)
        mapping = (
            db.query(Mapping)
            .join(TraditionalTerm)
            .options(joinedload(Mapping.icd11_code), joinedload(Mapping.traditional_term))
            .filter(
                TraditionalTerm.system == key,
                Mapping.status == "verified",
                or_(TraditionalTerm.code == code, TraditionalTerm.term == code)
            )
            .order_by(Mapping.is_primary.desc(), Mapping.id.asc())
            .first()
        )
        if mapping:
            fallback_used = True
    if not mapping:
        append_audit_log("fhir.conceptmap.translate", principal, {"system": key, "code": code, "result": False})
        return outcome_not_found("No verified mapping found (code or term)")
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
    if fallback_used:
        params["parameter"].append({"name": "note", "valueString": "Fallback used: non-primary verified mapping"})
    append_audit_log("fhir.conceptmap.translate", principal, {"system": key, "code": code, "result": True})
    return params
