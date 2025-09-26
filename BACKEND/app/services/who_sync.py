"""Background WHO sync scheduler.
Simplified: periodically re-fetch WHO data for known ICD names and update definitions/codes.
If changes exceed threshold, creates a new ConceptMapRelease and rebuilds elements.
"""
from datetime import datetime, timezone
import threading, time
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db import models
from app.core.config import settings
from app.services import who_api_client

_running_flag = False
_last_status = {
    "last_run": None,
    "changes": 0,
    "created_release": None,
    "next_run_eta_minutes": None,
}

THRESHOLD_NEW_OR_CHANGED = 10


def _rebuild_release(db: Session, version: str):
    rel = models.ConceptMapRelease(version=version, notes="Auto WHO sync release")
    db.add(rel)
    db.flush()
    mappings = db.query(models.Mapping) \
        .join(models.TraditionalTerm) \
        .join(models.ICD11Code) \
        .filter(models.Mapping.status == 'verified').all()
    for m in mappings:
        db.add(models.ConceptMapElement(
            release_id=rel.id,
            icd_name=m.icd11_code.icd_name,
            icd_code=m.icd11_code.icd_code,
            system=m.traditional_term.system,
            term=m.traditional_term.term,
            equivalence='equivalent',
            is_primary=m.is_primary
        ))
    db.commit()
    return rel.version


def _sync_cycle():
    global _running_flag, _last_status
    interval = max(settings.WHO_SYNC_INTERVAL_MINUTES, 15)
    while _running_flag:
        start = time.time()
        changes = 0
        created_release = None
        try:
            with SessionLocal() as db:
                icd_rows = db.query(models.ICD11Code).all()
                for icd in icd_rows:
                    try:
                        norm = who_api_client.search_and_fetch_entity(icd.icd_name)
                        if not norm:
                            continue
                        title = norm.get('title')
                        definition = norm.get('definition')
                        if isinstance(title, dict):
                            title = title.get('@value')
                        if isinstance(definition, dict):
                            definition = definition.get('@value')
                        dirty = False
                        if definition and definition != icd.description:
                            icd.description = definition
                            dirty = True
                        code_val = norm.get('code')
                        if code_val and code_val != icd.icd_code:
                            icd.icd_code = code_val
                            dirty = True
                        if dirty:
                            db.add(icd)
                            changes += 1
                    except Exception:
                        continue
                if changes:
                    db.commit()
                if changes >= THRESHOLD_NEW_OR_CHANGED:
                    version = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')
                    created_release = _rebuild_release(db, version)
        except Exception:
            pass
        _last_status.update({
            "last_run": datetime.now(timezone.utc).isoformat(),
            "changes": changes,
            "created_release": created_release,
            "next_run_eta_minutes": interval,
        })
        # Sleep remaining interval
        elapsed = time.time() - start
        remaining = interval * 60 - elapsed
        if remaining > 0:
            time.sleep(remaining)


def start_scheduler():
    global _running_flag
    if _running_flag or not settings.ENABLE_WHO_SYNC:
        return
    _running_flag = True
    t = threading.Thread(target=_sync_cycle, daemon=True)
    t.start()


def status():
    return _last_status


def trigger_once():
    # Run one immediate cycle in foreground (short path)
    with SessionLocal() as db:
        changes = 0
        created_release = None
        icd_rows = db.query(models.ICD11Code).limit(25).all()  # sample size to keep fast
        for icd in icd_rows:
            try:
                norm = who_api_client.search_and_fetch_entity(icd.icd_name)
                if not norm:
                    continue
                title = norm.get('title')
                definition = norm.get('definition')
                if isinstance(title, dict):
                    title = title.get('@value')
                if isinstance(definition, dict):
                    definition = definition.get('@value')
                dirty = False
                if definition and definition != icd.description:
                    icd.description = definition
                    dirty = True
                code_val = norm.get('code')
                if code_val and code_val != icd.icd_code:
                    icd.icd_code = code_val
                    dirty = True
                if dirty:
                    db.add(icd)
                    changes += 1
            except Exception:
                continue
        if changes:
            db.commit()
        return {"changes": changes, "sample": len(icd_rows)}
