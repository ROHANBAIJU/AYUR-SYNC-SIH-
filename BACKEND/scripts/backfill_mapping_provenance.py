"""Backfill provenance (origin, ingestion_filename) for existing Mapping rows created before provenance columns existed.

Strategy:
 1. Any mapping with NULL origin is assumed to be from ingestion if its traditional term matches a staging ingestion row.
 2. We attempt to locate an IngestionRow whose source_term/system matches the TraditionalTerm; if found we set origin='ingestion'
    and ingestion_filename via its batch.
 3. Otherwise we set origin='manual' to indicate it predates ingestion provenance tracking.

Idempotent: safe to re-run; only touches rows where origin IS NULL.

Usage:
  python -m scripts.backfill_mapping_provenance
"""
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db import models

def run():
    db = SessionLocal()
    updated = 0
    try:
        mappings = db.query(models.Mapping).filter(models.Mapping.origin.is_(None)).all()
        print(f"Found {len(mappings)} mappings without provenance.")
        if not mappings:
            return
        # Build quick lookup: (system, term) -> list of ingestion rows (batch id)
        ingestion_rows = db.query(models.IngestionRow).all()
        by_key: dict[tuple[str,str], list[models.IngestionRow]] = {}
        for r in ingestion_rows:
            key = (r.system.lower(), (r.source_term or '').strip().lower())
            by_key.setdefault(key, []).append(r)
        batches = {b.id: b for b in db.query(models.IngestionBatch).all()}
        for m in mappings:
            term = m.traditional_term
            if not term:
                continue
            key = (term.system.lower(), term.term.strip().lower())
            rows = by_key.get(key)
            if rows:
                # Pick earliest row's batch as provenance
                rows.sort(key=lambda r: r.id)
                first = rows[0]
                batch = batches.get(first.batch_id)
                m.origin = 'ingestion'
                m.ingestion_filename = batch.filename if batch else None
            else:
                m.origin = 'manual'
            updated += 1
        db.commit()
        print(f"Backfill complete. Updated {updated} mappings.")
    except Exception as e:
        db.rollback()
        print(f"Backfill failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
