from datetime import datetime, timezone
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import settings
from app.db.session import get_db
from app.db.models import Consent


def require_consent(scope: str):
    """Factory returning a dependency that enforces active consent for a scope when flag enabled.

    Logic:
    - If CONSENT_ENFORCEMENT disabled => pass.
    - Else require an active Consent row with (scope) AND subject_hash='*' (global) OR future: patient specific.
    - status must be active, valid_to either null or in future.
    Raises 403 if not satisfied.
    """
    def _dep(db: Session = Depends(get_db)):
        if not settings.CONSENT_ENFORCEMENT:
            return True
        now = datetime.now(timezone.utc)
        rec = (
            db.query(Consent)
            .filter(
                Consent.scope == scope,
                Consent.status == 'active',
                or_(Consent.valid_to == None, Consent.valid_to > now),
                Consent.subject_hash == '*'
            )
            .first()
        )
        if not rec:
            raise HTTPException(403, f"Active consent required for scope: {scope}")
        return True
    return _dep
