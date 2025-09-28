from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from app.db.session import get_db
from app.db import models

router = APIRouter(prefix="/conceptmap", tags=["conceptmap"])

@router.get("/releases")
def list_releases(db: Session = Depends(get_db)):
    q = db.execute(select(models.ConceptMapRelease).order_by(models.ConceptMapRelease.created_at.desc()))
    releases = []
    for r in q.scalars().all():
        # Proper COUNT aggregate instead of calling .count() on ScalarResult
        count = db.execute(
            select(func.count(models.ConceptMapElement.id)).where(models.ConceptMapElement.release_id == r.id)
        ).scalar_one()
        releases.append({
            "version": r.version,
            "created_at": str(r.created_at),
            "published_at": str(r.published_at) if r.published_at else None,
            "elements": count,
            "notes": r.notes,
        })
    return {"releases": releases}

@router.get("/releases/latest")
def latest_release(db: Session = Depends(get_db)):
    r = db.execute(select(models.ConceptMapRelease).order_by(models.ConceptMapRelease.created_at.desc())).scalars().first()
    if not r:
        raise HTTPException(404, "No releases found")
    return {"version": r.version, "created_at": str(r.created_at), "published_at": str(r.published_at), "notes": r.notes}

@router.get("/releases/{version}/elements")
def elements(version: str, icd_name: Optional[str] = None, system: Optional[str] = None, db: Session = Depends(get_db)):
    rel = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == version)).scalar_one_or_none()
    if not rel:
        raise HTTPException(404, "Release not found")
    stmt = select(models.ConceptMapElement).where(models.ConceptMapElement.release_id == rel.id)
    if icd_name:
        # Case-insensitive match on ICD name while preserving stored casing in output
        stmt = stmt.where(func.lower(models.ConceptMapElement.icd_name) == icd_name.lower())
    if system:
        stmt = stmt.where(models.ConceptMapElement.system == system)
    rows = db.execute(stmt).scalars().all()
    return {"version": version, "count": len(rows), "elements": [
        {
            "icd_name": e.icd_name,
            "icd_code": e.icd_code,
            "system": e.system,
            "term": e.term,
            "equivalence": e.equivalence,
            "is_primary": e.is_primary,
            "active": e.active
        } for e in rows
    ]}

@router.get("/releases/{version}/diff")
def diff_release(version: str, from_version: Optional[str] = None, db: Session = Depends(get_db)):
    """Compute a structural diff of ConceptMapElements between two releases.

    If `from_version` omitted, uses the chronologically previous release (by created_at) as baseline.
    Diff semantics:
      Key = (system, term, icd_name) – this trio defines a mapping association.
      Added: present in target, not in baseline.
      Removed: present in baseline, not in target.
      Changed: present in both but differing in at least one of: icd_code, equivalence, is_primary, active.
    """
    target = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == version)).scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Target release not found")

    # Resolve baseline
    baseline = None
    if from_version:
        baseline = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == from_version)).scalar_one_or_none()
        if not baseline:
            raise HTTPException(404, "Baseline release not found")
    else:
        # find previous release (created before target)
        baseline = db.execute(
            select(models.ConceptMapRelease)
            .where(models.ConceptMapRelease.created_at < target.created_at)
            .order_by(models.ConceptMapRelease.created_at.desc())
        ).scalars().first()

    if not baseline:
        # nothing to diff against
        return {
            "from": None,
            "to": version,
            "added": [],
            "removed": [],
            "changed": [],
            "summary": {"added": 0, "removed": 0, "changed": 0}
        }

    # Load elements for both releases
    base_rows = db.execute(select(models.ConceptMapElement).where(models.ConceptMapElement.release_id == baseline.id)).scalars().all()
    tgt_rows = db.execute(select(models.ConceptMapElement).where(models.ConceptMapElement.release_id == target.id)).scalars().all()

    def row_to_obj(e):
        return {
            "icd_name": e.icd_name,
            "icd_code": e.icd_code,
            "system": e.system,
            "term": e.term,
            "equivalence": e.equivalence,
            "is_primary": e.is_primary,
            "active": e.active
        }

    base_index = {(e.system, e.term, e.icd_name): row_to_obj(e) for e in base_rows}
    tgt_index = {(e.system, e.term, e.icd_name): row_to_obj(e) for e in tgt_rows}

    added = []
    removed = []
    changed = []

    for k, obj in tgt_index.items():
        if k not in base_index:
            added.append(obj)
        else:
            b = base_index[k]
            # compare change sensitive fields
            if any([
                (b.get('icd_code') or '') != (obj.get('icd_code') or ''),
                b.get('equivalence') != obj.get('equivalence'),
                bool(b.get('is_primary')) != bool(obj.get('is_primary')),
                bool(b.get('active')) != bool(obj.get('active'))
            ]):
                changed.append({
                    "before": b,
                    "after": obj
                })

    for k, obj in base_index.items():
        if k not in tgt_index:
            removed.append(obj)

    result = {
        "from": baseline.version,
        "to": version,
        "added": added,
        "removed": removed,
        "changed": changed,
        "summary": {"added": len(added), "removed": len(removed), "changed": len(changed)}
    }
    return result

@router.post("/releases/{version}/refresh")
def refresh_release(version: str, db: Session = Depends(get_db)):
    """Rebuild (or create) a ConceptMap release snapshot from current verified mappings.

    Steps:
      1. Find (or create) the release row.
      2. Delete existing ConceptMapElement rows for that release.
      3. Query all verified mappings (primary + aliases) and insert as elements.
      4. Return summary counts.

    This lets you verify mappings via /api/admin/verify then call this endpoint
    without restarting the server to expose them to FHIR $translate and provenance.
    """
    # 1. Find or create release
    rel = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == version)).scalar_one_or_none()
    if not rel:
        rel = models.ConceptMapRelease(version=version, notes="Auto-created via refresh endpoint")
        db.add(rel)
        db.flush()

    # 2. Delete existing elements
    db.query(models.ConceptMapElement).filter(models.ConceptMapElement.release_id == rel.id).delete()

    # 3. Gather verified mappings (include both primary & alias entries for transparency)
    mappings = db.query(models.Mapping) \
        .join(models.TraditionalTerm) \
        .join(models.ICD11Code) \
        .filter(models.Mapping.status == 'verified') \
        .all()

    inserted = 0
    for m in mappings:
        db.add(models.ConceptMapElement(
            release_id=rel.id,
            icd_name=m.icd11_code.icd_name,
            icd_code=m.icd11_code.icd_code or None,
            system=m.traditional_term.system,
            term=m.traditional_term.term,
            equivalence='equivalent',
            is_primary=m.is_primary
        ))
        inserted += 1

    db.commit()
    return {"version": version, "elements": inserted, "status": "refreshed"}


@router.get("/releases/{version}/fhir")
def export_fhir_conceptmap(version: str, summary: bool = False, db: Session = Depends(get_db)):
    """Export a ConceptMap release as a FHIR ConceptMap resource.

    Parameters:
      version: release version string
      summary: if true, omit heavy group.element arrays (provides counts only)
    """
    rel = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == version)).scalar_one_or_none()
    if not rel:
        raise HTTPException(404, "Release not found")
    # Group elements by traditional system
    rows = db.execute(select(models.ConceptMapElement).where(models.ConceptMapElement.release_id == rel.id)).scalars().all()
    groups: dict[str, dict] = {}
    for e in rows:
        g = groups.setdefault(e.system, {"source": f"https://ayur-sync.example/fhir/CodeSystem/{e.system}", "target": "http://id.who.int/icd/release/11/mms", "element": []})
        if not summary:
            g["element"].append({
                "code": e.term,
                "display": e.term,
                "target": [{
                    "code": e.icd_code or e.icd_name,
                    "display": e.icd_name,
                    "equivalence": e.equivalence
                }]
            })
    resource = {
        "resourceType": "ConceptMap",
        "id": f"namaste-to-icd11-{version}",
        "url": "https://ayur-sync.example/fhir/ConceptMap/namaste-to-icd11",
        "name": "NamasteToICD11",
        "title": "NAMASTE to ICD-11 ConceptMap",
        "status": "active",
        "version": version,
        "date": str(rel.created_at) if rel.created_at else None,
        "group": [
            {"source": g["source"], "target": g["target"], "element": g.get("element", []) if not summary else [], "extension": [
                {"url": "https://ayur-sync.example/fhir/StructureDefinition/elementCount", "valueInteger": len(g.get("element", []))}
            ]} for g in groups.values()
        ],
        "extension": [
            {"url": "https://ayur-sync.example/fhir/StructureDefinition/totalElements", "valueInteger": len(rows)}
        ]
    }
    if summary:
        # Provide overall counts only
        for g in resource["group"]:
            g.pop("element", None)
    return resource
