from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from app.db.session import get_db
from app.core.security import get_current_principal
from app.db.models import Mapping, TraditionalTerm, ICD11Code
from app.services import who_api_client
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- Pydantic Response Models ---

class SystemTerm(BaseModel):
    name: Optional[str]
    code: Optional[str]
    description: Optional[str]
    vernacular: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)

class SystemMappingEntry(BaseModel):
    primary: Optional[SystemTerm] = None
    aliases: List[SystemTerm] = Field(default_factory=list)

class ICDEntry(BaseModel):
    name: Optional[str]
    code: Optional[str]
    description: Optional[str]
    icd_uri: Optional[str]
    extra: Dict[str, Any] = Field(default_factory=dict)

class TranslateResult(BaseModel):
    ayurveda: Optional[SystemMappingEntry] = None
    siddha: Optional[SystemMappingEntry] = None
    unani: Optional[SystemMappingEntry] = None
    icd: Optional[ICDEntry] = None
    tm2: Optional[ICDEntry] = None

# --- Router Definition ---

router = APIRouter()

@router.get("/translate", response_model=TranslateResult)
async def translate_code(
    system: Optional[str] = Query(None, description="The source traditional medicine system (e.g., 'ayurveda')."),
    code: Optional[str] = Query(None, description="The source NAMASTE code (e.g., 'AKK-12')."),
    icd_name: Optional[str] = Query(None, description="ICD-11 disease name to enrich via WHO; preferred for WHO lookups."),
    release: Optional[str] = Query(None, description="ICD-11 linearization release to target (e.g., '2025-01')."),
    db: Session = Depends(get_db),
    principal = Depends(get_current_principal)
):
    """
    Translate endpoint behavior:
    - If icd_name is provided: use it to fetch WHO ICD/TM2 details and assemble
      traditional system mappings from VERIFIED DB for that ICD.
    - Else: use (system, code) to locate the VERIFIED mapping, derive the ICD name,
      then fetch WHO details for that ICD name.

    In all cases, WHO is queried with the ICD disease name, not the NAMASTE code.
    """
    icd_code: Optional[ICD11Code] = None

    if icd_name:
        icd_code = db.query(ICD11Code).filter(ICD11Code.icd_name == icd_name).first()
        if not icd_code:
            raise HTTPException(status_code=404, detail="ICD name not found.")
        # Ensure it's verified
        has_verified = db.query(Mapping).filter(
            Mapping.icd11_code_id == icd_code.id, Mapping.status == 'verified'
        ).first() is not None
        if not has_verified:
            raise HTTPException(status_code=400, detail="Disease not verified.")
    else:
        if not (system and code):
            raise HTTPException(status_code=400, detail="Provide either icd_name or (system and code).")
        mapping = (
            db.query(Mapping)
            .join(TraditionalTerm)
            .options(joinedload(Mapping.traditional_term), joinedload(Mapping.icd11_code))
            .filter(
                TraditionalTerm.system == system.lower(),
                TraditionalTerm.code == code,
                Mapping.status == 'verified',
                Mapping.is_primary == True
            )
            .first()
        )
        if not mapping:
            raise HTTPException(status_code=404, detail="No verified primary mapping found for the given NAMASTE code.")
        icd_code = mapping.icd11_code

    # 2. For the mapped ICD, pull the verified terms for each system (primary + aliases)
    verified_mappings = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .filter(
            Mapping.icd11_code_id == icd_code.id,
            Mapping.status == 'verified',
            # include both primary and aliases
        ).all()
    )

    sys_map: Dict[str, SystemMappingEntry] = {}
    for m in verified_mappings:
        t = m.traditional_term
        if t.system not in sys_map:
            sys_map[t.system] = SystemMappingEntry(primary=None, aliases=[])
        term_obj = SystemTerm(
            name=t.term,
            code=t.code,
            description=t.source_description,
            vernacular=t.devanagari or t.tamil or t.arabic,
            extra={"source_row": t.source_row}
        )
        if m.is_primary and sys_map[t.system].primary is None:
            sys_map[t.system].primary = term_obj
        else:
            sys_map[t.system].aliases.append(term_obj)

    # 3. Use the helper to fetch live data from the WHO API for the mapped ICD code
    # Prefer MMS search by release to fetch a code directly if available
    who_data = None
    mms_norm = None
    try:
        mms_norm = who_api_client.mms_search_by_release(icd_code.icd_name, release)
    except Exception:
        mms_norm = None
    if mms_norm and (mms_norm.get("code") or mms_norm.get("title")):
        who_data = mms_norm
    else:
        # Try foundation search -> release-specific linearized fetch to pull a code
        ent_uri = who_api_client.search_foundation_uri(icd_code.icd_name)
        ent_id = None
        if ent_uri:
            try:
                ent_id = ent_uri.rstrip('/').split('/')[-1]
            except Exception:
                ent_id = None
        if ent_id:
            lin = who_api_client.fetch_linearized_entity_by_release(ent_id, 'mms', release)
            if lin and (lin.get('code') or lin.get('title')):
                who_data = lin
            else:
                who_data = who_api_client.search_and_fetch_entity(icd_code.icd_name)
        else:
            who_data = who_api_client.search_and_fetch_entity(icd_code.icd_name)

    icd_entry: Optional[ICDEntry] = None
    if who_data:
        # Extract title/definition with tolerant handling of dict or string
        def _val(x):
            if isinstance(x, dict):
                return x.get("@value") or x.get("value")
            return x
        title = _val(who_data.get("title"))
        definition = _val(who_data.get("definition"))
        # Only set code if WHO returns a code; otherwise leave None.
        icd_code_val = who_data.get("code") or None
        icd_uri = who_data.get("@id")

        # If definition was not present in the initial normalized search result,
        # fetch full entity details using the @id to obtain the definition.
        if not definition and icd_uri:
            try:
                full_ent = who_api_client.get_entity_details(icd_uri)
                if full_ent:
                    title = _val(full_ent.get("title")) or title
                    definition = _val(full_ent.get("definition")) or definition
                    icd_code_val = full_ent.get("code") or icd_code_val
            except Exception:
                pass

        # Persist WHO definition and ICD code into ICD table so it appears in ICD list
        try:
            dirty = False
            if definition and (icd_code.description != definition):
                icd_code.description = definition
                dirty = True
            # Save the WHO MMS/TM2 code if provided
            if icd_code_val and getattr(icd_code, 'icd_code', None) != icd_code_val:
                icd_code.icd_code = icd_code_val
                dirty = True
            if dirty:
                db.add(icd_code)
                db.commit()
        except Exception:
            db.rollback()

        icd_entry = ICDEntry(
            name=title,
            code=icd_code_val,
            description=definition,
            icd_uri=icd_uri,
            extra={}
        )

    # 4. Try to fetch a TM2 entry (best-effort) via WHO API helper.
    tm2_entry: Optional[ICDEntry] = None
    tm2_data = who_api_client.search_and_fetch_tm2(icd_code.icd_name)
    # Fallback: try traditional term names (primary first, then aliases across systems)
    if not tm2_data:
        alt_terms: list[str] = []
        for syskey, entry in sys_map.items():
            if entry and entry.primary and entry.primary.name:
                alt_terms.append(entry.primary.name)
            if entry:
                for al in entry.aliases:
                    if al.name:
                        alt_terms.append(al.name)
        if alt_terms:
            try:
                tm2_data = who_api_client.search_tm2_by_terms(alt_terms[:10])  # cap to 10 variants
            except Exception:
                tm2_data = None
    if tm2_data:
        tm2_title = (tm2_data.get("title") or {}).get("@value") if isinstance(tm2_data.get("title"), dict) else tm2_data.get("title")
        tm2_definition = (tm2_data.get("definition") or {}).get("@value") if isinstance(tm2_data.get("definition"), dict) else tm2_data.get("definition")
        tm2_code_val = tm2_data.get("code")
        tm2_uri = tm2_data.get("@id") or tm2_data.get("id")
        tm2_entry = ICDEntry(
            name=tm2_title,
            code=tm2_code_val,
            description=tm2_definition,
            icd_uri=tm2_uri,
            extra={}
        )
    # If still no TM2, try release-aware TM2 search by icd_name and alternative terms; then foundation->linearized by release
    if not tm2_entry:
        tm2_norm = None
        try:
            tm2_norm = who_api_client.tm2_search_by_release(icd_code.icd_name, release)
        except Exception:
            tm2_norm = None
        if not tm2_norm:
            alt_terms: list[str] = []
            for entry in sys_map.values():
                if entry and entry.primary and entry.primary.name:
                    alt_terms.append(entry.primary.name)
                if entry:
                    for al in entry.aliases:
                        if al.name:
                            alt_terms.append(al.name)
            for t in alt_terms[:10]:
                try:
                    tm2_norm = who_api_client.tm2_search_by_release(t, release)
                    if tm2_norm:
                        break
                except Exception:
                    continue
        if tm2_norm:
            tm2_entry = ICDEntry(
                name=tm2_norm.get("title", {}).get("@value") if isinstance(tm2_norm.get("title"), dict) else tm2_norm.get("title"),
                code=tm2_norm.get("code"),
                description=None,
                icd_uri=tm2_norm.get("@id") or tm2_norm.get("id"),
                extra={}
            )
        else:
            # Foundation search then TM2 linearized for a specific release
            ent_uri2 = who_api_client.search_foundation_uri(icd_code.icd_name)
            ent_id2 = None
            if ent_uri2:
                try:
                    ent_id2 = ent_uri2.rstrip('/').split('/')[-1]
                except Exception:
                    ent_id2 = None
            if ent_id2:
                tm2_lin = who_api_client.fetch_linearized_entity_by_release(ent_id2, 'tm2', release)
                if tm2_lin and (tm2_lin.get('code') or tm2_lin.get('title')):
                    tm2_entry = ICDEntry(
                        name=(tm2_lin.get("title") or {}).get("@value") if isinstance(tm2_lin.get("title"), dict) else tm2_lin.get("title"),
                        code=tm2_lin.get("code"),
                        description=(tm2_lin.get("definition") or {}).get("@value") if isinstance(tm2_lin.get("definition"), dict) else tm2_lin.get("definition"),
                        icd_uri=tm2_lin.get("@id") or tm2_lin.get("id"),
                        extra={}
                    )

    # 5. Assemble the final response
    return TranslateResult(
        ayurveda=sys_map.get('ayurveda'),
        siddha=sys_map.get('siddha'),
        unani=sys_map.get('unani'),
        icd=icd_entry,
        tm2=tm2_entry
    )