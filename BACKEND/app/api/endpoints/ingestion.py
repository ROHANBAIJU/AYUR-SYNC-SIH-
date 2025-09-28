from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, func, inspect
from typing import Optional, List, Dict
from pydantic import BaseModel
import csv, io, json
from pathlib import Path

try:
    import pandas as _pd  # optional; only used for XLS/XLSX
except Exception:  # pragma: no cover - fallback if pandas not installed
    _pd = None

from app.core.security import get_current_user
from app.db.session import get_db
from app.db import models
from app.services.ai_inference import infer_icd_name_structured, enqueue_inference

# Reuse the existing Gemini verification logic used elsewhere (admin endpoints)
# to avoid duplicating AI prompt code. Import is local to prevent circular imports
# at module load if admin.py ever imports ingestion endpoints in the future.
try:
    from app.api.endpoints.admin import get_gemini_verification  # type: ignore
except Exception:  # pragma: no cover - soft fallback if import ordering changes
    get_gemini_verification = None  # AI enrichment will be skipped gracefully

def _update_row_inference(db: Session, row_id: int, result):
    """Callback used by background queue to persist inference results."""
    row = db.query(models.IngestionRow).filter(models.IngestionRow.id == row_id).one_or_none()
    if not row:
        return
    if getattr(result, 'error', None):
        row.inference_status = 'error'
    else:
        row.suggested_icd_name = getattr(result, 'name', None) or row.suggested_icd_name
        row.ai_confidence = getattr(result, 'confidence', None) or row.ai_confidence
        row.ai_justification = getattr(result, 'justification', None) or row.ai_justification
        row.inference_status = 'done'
    db.add(row)
    db.commit()

router = APIRouter(prefix="/ingest", tags=["ingestion"])

# NOTE: Temporary debug routes and import-time fingerprint logging removed after verification.

@router.post("/upload")
async def upload_suggestions(
    file: UploadFile = File(..., description="CSV/TSV/XLS/XLSX with columns: system, code, term, (optional) suggested_icd_name, short_definition, long_definition, vernacular_term"),
    enrich_missing: bool = Form(True),  # legacy placeholder title-casing
    ai_infer_missing: bool = Form(True),  # NEW: run lightweight AI name inference when ICD name missing
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Upload a suggestions file (CSV or Excel) and stage rows.

    New behaviour (2024-09):
      - If suggested_icd_name is absent and ai_infer_missing=True we attempt an AI paraphrase to a probable ICD disease name
        using the same Gemini verification model (fast flash variant). Falls back to title case of term.
      - The AI call is intentionally lightweight and batched per unique term to avoid redundant calls in the same file.
      - We DO NOT persist new ICD11Code rows here; they are still created on promotion to keep staging reversible.
    """
    raw_bytes = await file.read()
    suffix = Path(file.filename.lower()).suffix
    rows: list[dict] = []
    # --- Parse ---
    if suffix in ('.csv', '.tsv'):
        delimiter = '\t' if suffix == '.tsv' else ','
        try:
            text = raw_bytes.decode('utf-8')
        except Exception:
            raise HTTPException(400, "File must be UTF-8 encoded")
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        for r in reader:
            rows.append(r)
    elif suffix in ('.xls', '.xlsx'):
        if not _pd:
            raise HTTPException(400, "pandas is required for Excel ingestion but is not installed")
        try:
            df = _pd.read_excel(io.BytesIO(raw_bytes))
        except Exception as e:
            raise HTTPException(400, f"Failed to parse Excel: {e}")
        rows = df.to_dict(orient='records')
    else:
        raise HTTPException(400, "Unsupported file type; must be CSV/TSV/XLS/XLSX")

    # Normalize headers to lower for lookups without altering original payload
    required = {"system", "term"}
    if rows:
        # Sanitize header keys: CSV DictReader can yield a None key if a data row has
        # more columns than the header line (e.g., stray leading line or malformed file),
        # which previously caused AttributeError: 'NoneType' object has no attribute 'lower'.
        header_keys = [k for k in rows[0].keys() if k]
        first_keys_lower = {k.lower() for k in header_keys}
        if not required.issubset(first_keys_lower):
            # Provide diagnostic detail to help users correct formatting issues.
            raise HTTPException(
                400,
                (
                    f"Input must include at least columns: {', '.join(required)}; "
                    f"found headers={header_keys}. Ensure first line is the header and contains those columns."
                ),
            )

    batch = models.IngestionBatch(filename=file.filename)
    db.add(batch); db.flush()
    total = 0
    enriched_count = 0
    # Cache for AI inferred names to avoid duplicate model calls within one upload
    ai_name_cache: dict[str,str] = {}
    ai_failures = 0
    for row in rows:
        # Drop any None key that may have been generated by uneven columns
        if None in row:
            try:
                row.pop(None)
            except Exception:
                pass
        total += 1
        # Case-insensitive access
        def _g(name: str):
            for k, v in row.items():
                if k.lower() == name:
                    return v
            return None
        def _g_many(names: list[str]):
            for n in names:
                v = _g(n)
                if v not in (None, ''):
                    return v
            return None
        system = (_g_many(['system','namaste_system','traditional_system']) or '').strip().lower()
        term = _g_many(['term','namaste_term','namaste_disease_name','source_term']) or ''
        if not system or not term:
            continue
        suggested = _g_many(['suggested_icd_name','icd_name'])
        # Legacy confidence/justification (ignored for new format but preserved if supplied)
        conf = _g('confidence') or _g('confidence_score')
        just = _g('justification')
        icd_code_inline = _g_many(['icd_code','who_icd_code'])
        short_def = _g('short_definition')
        long_def = _g('long_definition')
        vernacular = _g_many(['vernacular_term','vernacular'])
        # Normalize pandas NaN -> None so enrichment logic fires
        for name, val in [('suggested', suggested), ('conf', conf), ('just', just)]:
            if isinstance(val, float):
                try:
                    import math
                    if math.isnan(val):
                        if name == 'suggested': suggested = None
                        elif name == 'conf': conf = None
                        elif name == 'just': just = None
                except Exception:
                    pass
        # Name inference pipeline if missing (background structured inference)
        inference_status = None
        if not suggested:
            if ai_infer_missing:
                # Queue background inference and leave name blank for now (UI can poll status)
                inference_status = 'queued'
            elif enrich_missing:
                suggested = term.strip().title(); enriched_count += 1
        elif suggested and ai_infer_missing:
            # If user provided a suggested name we will not re-infer; mark as done implicitly
            inference_status = 'done'
        payload = dict(row)
        if icd_code_inline and 'icd_code' not in payload:
            payload['icd_code'] = icd_code_inline
        ingestion_row = models.IngestionRow(
            batch_id=batch.id,
            system=system,
            source_code=_g('code') or _g('source_code'),
            source_term=term,
            raw_payload=json.dumps(payload, ensure_ascii=False),
            suggested_icd_name=suggested,
            ai_confidence=_coerce_conf(conf) if conf is not None else None,
            ai_justification=just,
            short_definition=short_def,
            long_definition=long_def,
            vernacular_term=vernacular,
            inference_status=inference_status,
        )
        db.add(ingestion_row)
        db.flush()
        if inference_status == 'queued':
            # enqueue background inference task
            enqueue_inference(db, ingestion_row.id, term, _update_row_inference)
    batch.total_rows = total
    batch.processed_rows = total
    batch.status = 'parsed'
    db.commit()
    return {"batch_id": batch.id, "rows": total, "status": batch.status, "enriched_rows": enriched_count}

def _coerce_conf(val) -> int:
    if val is None:
        return 0
    try:
        s = str(val).strip()
        if s.endswith('%'): s = s[:-1]
        return int(float(s))
    except Exception:
        return 0

@router.get("/batches")
def list_batches(db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.execute(select(models.IngestionBatch).order_by(models.IngestionBatch.created_at.desc()))
    batches = []
    for b in q.scalars():
        batches.append({
            "id": b.id,
            "filename": b.filename,
            "status": b.status,
            "total_rows": b.total_rows,
            "processed_rows": b.processed_rows,
            "created_at": str(b.created_at)
        })
    return {"batches": batches}

@router.get("/batches/{batch_id}/rows")
def batch_rows(
    batch_id: int,
    limit: int = 500,
    q: Optional[str] = None,
    status: Optional[str] = None,
    system: Optional[str] = None,
    min_conf: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """List staging rows with optional filtering.

    Filters:
      - q: substring search (case-insensitive) over source_term
      - status: pending|promoted|rejected
      - system: ayurveda|siddha|unani
      - min_conf: minimum ai_confidence (integer)
    """
    batch = db.get(models.IngestionBatch, batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    stmt = select(models.IngestionRow).where(models.IngestionRow.batch_id == batch_id)
    if q:
        like = f"%{q.lower()}%"
        # Using LOWER comparison for cross-db safety
        stmt = stmt.where(func.lower(models.IngestionRow.source_term).like(like))
    if status:
        stmt = stmt.where(models.IngestionRow.status == status)
    if system:
        stmt = stmt.where(models.IngestionRow.system == system.lower())
    if min_conf is not None:
        stmt = stmt.where(models.IngestionRow.ai_confidence >= min_conf)
    stmt = stmt.limit(limit)
    rows = db.execute(stmt).scalars().all()
    return {
        "batch_id": batch_id,
        "rows": [
            {
                "id": r.id,
                "system": r.system,
                "source_code": r.source_code,
                "source_term": r.source_term,
                "suggested_icd_name": r.suggested_icd_name,
                "ai_confidence": r.ai_confidence,
                # Expose justification so frontend can render enriched badge / tooltips
                "ai_justification": r.ai_justification,
                "short_definition": r.short_definition,
                "long_definition": r.long_definition,
                "vernacular_term": r.vernacular_term,
                "inference_status": getattr(r, 'inference_status', None),
                # Derived flag: rows where we auto-generated a placeholder ICD name (no AI enrichment)
                "placeholder_enriched": bool(
                    r.suggested_icd_name and
                    (r.suggested_icd_name == (r.source_term or '').strip().title()) and
                    (r.ai_confidence is None) and
                    (not r.ai_justification or not r.ai_justification.strip())
                ),
                "status": r.status,
            }
            for r in rows
        ],
    }

@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete an ingestion batch and cascade delete its rows."""
    batch = db.get(models.IngestionBatch, batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    db.delete(batch)
    db.commit()
    return {"deleted": batch_id}

@router.delete("/rows/{row_id}")
def delete_row(row_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete a single ingestion row (does not affect batch counters)."""
    row = db.get(models.IngestionRow, row_id)
    if not row:
        raise HTTPException(404, "Row not found")
    db.delete(row)
    db.commit()
    return {"deleted": row_id}

def _promote_single(row: models.IngestionRow, db: Session, force_primary: bool = False, enrich_ai: bool = True) -> Dict:
    # Synchronous inference on-demand if name still missing. Never block promotion if AI is unavailable.
    if not row.suggested_icd_name:
        try:
            inf = infer_icd_name_structured(row.source_term)
        except Exception as e:  # pragma: no cover
            class _Err: pass
            inf = _Err(); inf.error = f"AI call failed: {e}"; inf.name=None; inf.confidence=None; inf.justification=None
        if getattr(inf, 'error', None) or not getattr(inf, 'name', None):
            fallback = (row.source_term or '').strip().title()
            if not fallback:
                raise HTTPException(400, "Row missing suggested_icd_name and empty source_term; cannot promote")
            row.suggested_icd_name = fallback
            row.ai_confidence = 0
            row.ai_justification = 'N/A'
            row.inference_status = 'done'
        else:
            row.suggested_icd_name = inf.name
            row.ai_confidence = inf.confidence
            row.ai_justification = inf.justification or 'N/A'
            row.inference_status = 'done'
    icd = db.query(models.ICD11Code).filter_by(icd_name=row.suggested_icd_name).first()
    if not icd:
        icd = models.ICD11Code(icd_name=row.suggested_icd_name)
        db.add(icd)
        db.flush()
    else:
        # If row payload includes icd_code and our record lacks it, populate.
        try:
            payload = json.loads(row.raw_payload or '{}')
            inline_code = payload.get('icd_code') or payload.get('who_icd_code')
            if inline_code and not icd.icd_code:
                icd.icd_code = inline_code
        except Exception:
            pass
    term = db.query(models.TraditionalTerm).filter_by(system=row.system, term=row.source_term, code=row.source_code).first()
    if not term:
        term = models.TraditionalTerm(
            system=row.system,
            term=row.source_term,
            code=row.source_code,
            source_short_definition=row.short_definition or None,
            source_long_definition=row.long_definition or None,
        )
        db.add(term)
        db.flush()
    else:
        # Backfill definition fields if they were not previously populated
        updated = False
        if (not getattr(term, 'source_short_definition', None)) and row.short_definition:
            term.source_short_definition = row.short_definition; updated = True
        if (not getattr(term, 'source_long_definition', None)) and row.long_definition:
            term.source_long_definition = row.long_definition; updated = True
        if updated:
            db.add(term)
    # Auto-primary: first mapping for icd+system (verified or suggested primary) wins
    existing_primary = db.query(models.Mapping).join(models.TraditionalTerm).filter(
        models.Mapping.icd11_code_id == icd.id,
        models.TraditionalTerm.system == row.system,
        models.Mapping.is_primary == True
    ).first()
    is_primary = force_primary or (existing_primary is None)
    placement = 'primary' if is_primary else 'alias'
    # Determine origin & source filename (batch may not always be present if row detached)
    batch = db.get(models.IngestionBatch, row.batch_id) if row.batch_id else None
    mapping = models.Mapping(
        icd11_code_id=icd.id,
        traditional_term_id=term.id,
        # Newly promoted mappings should enter the REVIEW funnel first as 'suggested'.
        # Separate curator actions (not ingestion) will move them to 'staged' and then 'verified'.
        status='suggested',
        is_primary=is_primary,
        ai_confidence=row.ai_confidence,
        ai_justification=row.ai_justification,
        origin='ingestion',
        ingestion_filename=batch.filename if batch else None,
    )
    db.add(mapping)

    # Audit trail entry for promotion (uses action 'promote' instead of legacy 'verify').
    try:
        from app.db.models import MappingAudit  # local import to avoid circulars if any
        db.add(MappingAudit(mapping_id=mapping.id if mapping.id else None, action='promote', actor='system', reason='ingestion promote'))
    except Exception:
        pass  # non-fatal

    # --- Optional AI enrichment (only if missing) ---
    enriched = False
    if enrich_ai and get_gemini_verification and (not mapping.ai_confidence or mapping.ai_justification in (None, '', 'AI analysis failed', 'N/A')):
        try:
            ai_payload = {
                "primary": {
                    "term": row.source_term,
                    "code": row.source_code,
                    # Provide richest available description to model
                    "source_description": row.long_definition or row.short_definition or '',
                }
            }
            ai_result = get_gemini_verification(row.suggested_icd_name, ai_payload)
            mapping.ai_confidence = int(ai_result.get('confidence') or 0)
            mapping.ai_justification = ai_result.get('justification') or 'AI analysis missing justification.'
            # Persist back to the staging row as provenance for later analytics
            row.ai_confidence = mapping.ai_confidence
            row.ai_justification = mapping.ai_justification
            enriched = True
        except Exception as e:  # pragma: no cover - resilience path
            # Do not fail promotion if AI model call errors; standardize placeholder.
            if not mapping.ai_confidence:
                mapping.ai_confidence = 0
            mapping.ai_justification = 'N/A'

    row.status = 'promoted'
    return {
        "row_id": row.id,
        "mapping_id": mapping.id if mapping.id else None,
        "primary": is_primary,
        "placement": placement,
        "ai_enriched": enriched,
        "ai_confidence": mapping.ai_confidence,
        "ai_justification": mapping.ai_justification,
        "icd_name": row.suggested_icd_name,
        "suggested_icd_name": row.suggested_icd_name,
    }

@router.post("/rows/{row_id}/promote")
def promote_row(
    row_id: int,
    primary: bool = Form(False),
    enrich_ai: bool = Form(True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Promote a staged row to a Mapping (status=suggested).

    Parameters:
      - primary: force this mapping to become primary for its ICD/system if True.
      - enrich_ai: run AI confidence/justification enrichment if missing (default True).
    """
    row = db.get(models.IngestionRow, row_id)
    if not row:
        raise HTTPException(404, "Row not found")
    if row.status == 'promoted':
        return {"row_id": row.id, "detail": "already promoted"}
    result = _promote_single(row, db, force_primary=primary, enrich_ai=enrich_ai)
    db.commit()
    return result

class BulkRowIds(BaseModel):
    row_ids: List[int]
    primary: bool | None = None
    enrich_ai: bool | None = True


@router.post("/rows/bulk_promote")
def bulk_promote(payload: BulkRowIds, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Bulk promote multiple row IDs.

    AI enrichment is attempted for each promoted row if (a) enrich_ai is True and
    (b) the row lacks existing ai_confidence/justification.
    Returns successes with enrichment metadata and any per-row errors.
    """
    successes = []
    errors = []
    for rid in payload.row_ids:
        row = db.get(models.IngestionRow, rid)
        if not row:
            errors.append({"row_id": rid, "error": "not found"})
            continue
        if row.status == 'promoted':
            successes.append({"row_id": rid, "detail": "already promoted"})
            continue
        try:
            res = _promote_single(
                row,
                db,
                force_primary=payload.primary or False,
                enrich_ai=payload.enrich_ai if payload.enrich_ai is not None else True
            )
            successes.append(res)
        except Exception as e:
            errors.append({"row_id": rid, "error": str(e)})
    db.commit()
    return {"promoted": successes, "errors": errors}

@router.post("/rows/{row_id}/reject")
def reject_row(row_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.get(models.IngestionRow, row_id)
    if not row:
        raise HTTPException(404, "Row not found")
    if row.status == 'rejected':
        return {"row_id": row.id, "detail": "already rejected"}
    row.status = 'rejected'
    db.commit()
    return {"row_id": row.id, "status": row.status}

class BulkRejectIds(BaseModel):
    row_ids: List[int]

@router.post("/rows/bulk_reject")
def bulk_reject(payload: BulkRejectIds, db: Session = Depends(get_db), user=Depends(get_current_user)):
    updated = []
    errors = []
    for rid in payload.row_ids:
        row = db.get(models.IngestionRow, rid)
        if not row:
            errors.append({"row_id": rid, "error": "not found"}); continue
        if row.status == 'rejected':
            updated.append({"row_id": rid, "detail": "already rejected"}); continue
        row.status = 'rejected'
        updated.append({"row_id": rid, "status": 'rejected'})
    db.commit()
    return {"rejected": updated, "errors": errors}

@router.get("/diagnostics")
def ingestion_diagnostics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return schema & basic health diagnostics for ingestion tables."""
    insp = inspect(db.bind)
    tables = ['ingestion_batches', 'ingestion_rows', 'mappings']
    table_info = {}
    for t in tables:
        try:
            cols = [c['name'] for c in insp.get_columns(t)]
            table_info[t] = {
                'exists': True,
                'columns': cols,
            }
        except Exception:
            table_info[t] = {'exists': False, 'columns': []}
    counts = {}
    for model, key in [
        (models.IngestionBatch, 'ingestion_batches'),
        (models.IngestionRow, 'ingestion_rows'),
        (models.Mapping, 'mappings'),
    ]:
        try:
            counts[key] = db.query(func.count(model.id)).scalar()
        except Exception as e:
            counts[key] = f"error: {e}"  # pragma: no cover
    # Recent batches summary
    recent = db.query(models.IngestionBatch).order_by(models.IngestionBatch.created_at.desc()).limit(5).all()
    recent_batches = [
        {
            'id': b.id,
            'filename': b.filename,
            'status': b.status,
            'total_rows': b.total_rows,
            'processed_rows': b.processed_rows,
            'created_at': str(b.created_at),
        }
        for b in recent
    ]
    return {
        'tables': table_info,
        'counts': counts,
        'recent_batches': recent_batches,
    }
