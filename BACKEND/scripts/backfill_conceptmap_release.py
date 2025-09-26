"""Backfill script: create initial ConceptMap release (v1-submission) from current verified mappings.
Run with: python -m scripts.backfill_conceptmap_release
"""
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db import models
from sqlalchemy import select

RELEASE_VERSION = "v1-submission"


def build_release(db: Session):
    # Check if release already exists
    existing = db.execute(select(models.ConceptMapRelease).where(models.ConceptMapRelease.version == RELEASE_VERSION)).scalar_one_or_none()
    if existing:
        print(f"Release {RELEASE_VERSION} already exists. Skipping.")
        return existing

    release = models.ConceptMapRelease(version=RELEASE_VERSION, notes="Initial hackathon submission snapshot")
    db.add(release)
    db.flush()  # get ID

    # Query verified mappings
    # We assume Mapping.status == 'verified' (case-insensitive) qualifies
    verified_mappings = db.execute(select(models.Mapping).where(models.Mapping.status.ilike('verified'))).scalars().all()
    count = 0
    for m in verified_mappings:
        icd = m.icd11_code
        term = m.traditional_term
        if not icd or not term:
            continue
        db.add(models.ConceptMapElement(
            release_id=release.id,
            icd_name=icd.icd_name,
            icd_code=icd.icd_code,
            system=term.system,
            term=term.term,
            equivalence='equivalent',
            is_primary=m.is_primary,
        ))
        count += 1
    db.commit()
    print(f"Created release {RELEASE_VERSION} with {count} elements.")
    return release


def main():
    db = SessionLocal()
    try:
        build_release(db)
    finally:
        db.close()

if __name__ == "__main__":
    main()
