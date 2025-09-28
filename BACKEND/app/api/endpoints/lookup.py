# File: app/api/endpoints/lookup.py
# DEFINITIVE VERSION with correct data structure

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.core.security import get_current_principal
from app.db.models import Mapping, TraditionalTerm, ICD11Code, ConceptMapElement, ConceptMapRelease
from typing import List, Optional
from pydantic import BaseModel
from collections import defaultdict

# --- NEW, more accurate Pydantic Models ---

class MatchedTerm(BaseModel):
    term: str
    code: str | None
    source_description: str | None
    vernacular: str | None

class SystemMapping(BaseModel):
    system: str
    primary_term: MatchedTerm | None = None
    aliases: List[MatchedTerm] = []

class LookupResult(BaseModel):
    icd_name: str
    icd_description: str | None
    system_mappings: List[SystemMapping]

class LookupSuggestion(BaseModel):
    """Unified suggestion record.
    For an ICD driven query we return all NAMASTE terms (primary + aliases) across systems.
    For a traditional query we return the specific term + its ICD anchor.
    kind: icd|traditional|snapshot to allow UI to style snapshot‑fallback items differently.
    """
    kind: str
    icd_name: Optional[str] = None
    system: Optional[str] = None
    term: Optional[str] = None
    code: Optional[str] = None
    is_primary: Optional[bool] = None

# --- Router Definition ---

router = APIRouter()

@router.get("/lookup", response_model=List[LookupResult])
async def lookup_term(
    query: str = Query(..., min_length=2, description="Search (smart) across ICD-11 names/codes and traditional system terms/codes/aliases."),
    system: str | None = Query(None, description="Optional system hint (ayurveda|siddha|unani)."),
    use_snapshot_fallback: bool = Query(True, description="If no live verified mappings, fallback to latest ConceptMap snapshot."),
    db: Session = Depends(get_db),
    principal = Depends(get_current_principal)
):
    """Smart unified lookup.
    Rules (requested behavior):
    1. If user types an Ayurvedic/Siddha/Unani primary or alias term (or its code), return that ICD anchor plus ALL system mappings (primary + aliases) for that ICD.
    2. If user types an ICD name or ICD code, return all system primary + alias terms bound to that ICD.
    3. Matching considers: traditional.term, traditional.code, vernacular (devanagari|tamil|arabic), ICD name, ICD code.
    4. If nothing in live verified mappings matches and snapshot fallback enabled, read latest ConceptMapRelease elements.
    """
    import re
    q_raw = query.strip()
    q_lower = q_raw.lower()
    like = f"%{q_lower}%"

    # Pattern hints
    looks_like_icd_code = bool(re.match(r"^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$", q_raw, flags=re.I))
    looks_like_tm_code = bool(re.match(r"^[A-Z]{1,6}[-_]?[0-9]{1,5}[A-Z0-9]*$", q_raw, flags=re.I))

    # 1. Try to resolve candidate ICD IDs via verified mappings
    base_q = db.query(Mapping).join(TraditionalTerm).join(ICD11Code).filter(Mapping.status=='verified')
    term_match_filter = or_(
        TraditionalTerm.term.ilike(like),
        TraditionalTerm.code.ilike(q_raw) if looks_like_tm_code else TraditionalTerm.code.ilike(like),
        TraditionalTerm.devanagari.ilike(like),
        TraditionalTerm.tamil.ilike(like),
        TraditionalTerm.arabic.ilike(like),
        ICD11Code.icd_name.ilike(like),
        ICD11Code.icd_code.ilike(q_raw) if looks_like_icd_code else ICD11Code.icd_code.ilike(like)
    )
    if system:
        term_match_filter = and_(term_match_filter, TraditionalTerm.system==system.lower())

    candidate_mappings = base_q.filter(term_match_filter).options(
        joinedload(Mapping.traditional_term), joinedload(Mapping.icd11_code)
    ).all()

    icd_ids = {m.icd11_code_id for m in candidate_mappings}

    if not icd_ids and use_snapshot_fallback:
        # Fallback to latest snapshot release elements (acts as cached system mapping)
        latest_rel = db.query(ConceptMapRelease).order_by(ConceptMapRelease.created_at.desc()).first()
        if latest_rel:
            el_q = db.query(ConceptMapElement).filter(ConceptMapElement.release_id==latest_rel.id)
            # filter by term/code/system or icd
            el_filters = [or_(
                ConceptMapElement.icd_name.ilike(like),
                ConceptMapElement.icd_code.ilike(q_raw) if looks_like_icd_code else ConceptMapElement.icd_code.ilike(like),
                ConceptMapElement.term.ilike(like)
            )]
            if system:
                el_filters.append(ConceptMapElement.system==system.lower())
            snapshot_elements = el_q.filter(and_(*el_filters)).limit(200).all()
            if snapshot_elements:
                # Build pseudo LookupResult objects from snapshot
                grouped = defaultdict(lambda: defaultdict(list))  # icd -> system -> elements
                icd_desc_cache: dict[str,str|None] = {}
                for el in snapshot_elements:
                    grouped[el.icd_name][el.system].append(el)
                results: list[LookupResult] = []
                for icd_name, sys_map in grouped.items():
                    system_mappings: list[SystemMapping] = []
                    for sys_name, els in sys_map.items():
                        primary_el = next((e for e in els if e.is_primary), None)
                        primary_term = MatchedTerm(
                            term=primary_el.term if primary_el else (els[0].term if els else ''),
                            code=None,
                            source_description=None,
                            vernacular=None
                        ) if els else None
                        aliases_terms = []
                        for e in els:
                            if primary_el and e.id==primary_el.id:
                                continue
                            aliases_terms.append(MatchedTerm(term=e.term, code=None, source_description=None, vernacular=None))
                        system_mappings.append(SystemMapping(system=sys_name, primary_term=primary_term, aliases=aliases_terms))
                    results.append(LookupResult(icd_name=icd_name, icd_description=None, system_mappings=system_mappings))
                return results
        return []

    # If we have candidate ICD IDs but limited mappings (e.g., match on term) expand to ALL verified mappings for those ICDs

    all_mappings = db.query(Mapping).filter(Mapping.status=='verified', Mapping.icd11_code_id.in_(icd_ids)) \
        .options(joinedload(Mapping.traditional_term), joinedload(Mapping.icd11_code)).all()

    results_dict = defaultdict(lambda: {"icd_description": None, "systems": defaultdict(lambda: {"primary": None, "aliases": []})})

    def push_mapping(m: Mapping):
        icd = m.icd11_code
        td = m.traditional_term
        slot = results_dict[icd.icd_name]
        if slot["icd_description"] is None:
            slot["icd_description"] = icd.description
        entry = {
            "term": td.term,
            "code": td.code,
            "source_description": td.source_description,
            "vernacular": td.devanagari or td.tamil or td.arabic
        }
        sys_block = slot["systems"][td.system]
        if m.is_primary and sys_block["primary"] is None:
            sys_block["primary"] = entry
        else:
            sys_block["aliases"].append(entry)

    for m in all_mappings:
        push_mapping(m)

    final: list[LookupResult] = []
    for icd_name, data in results_dict.items():
        sms: list[SystemMapping] = []
        for sys_name, block in data["systems"].items():
            sms.append(SystemMapping(system=sys_name, primary_term=block["primary"], aliases=block["aliases"]))
        final.append(LookupResult(icd_name=icd_name, icd_description=data["icd_description"], system_mappings=sms))
    return final

@router.get("/lookup/suggest", response_model=List[LookupSuggestion])
async def lookup_suggest(
    q: str = Query(..., min_length=2, description="Typeahead smart suggestions (ICD anchor first, then traditional)."),
    system: Optional[str] = Query(None, description="Filter to a traditional system for term matches."),
    limit: int = Query(20, ge=1, le=60),
    include_snapshot: bool = Query(True, description="Include snapshot fallback if no live matches."),
    db: Session = Depends(get_db),
    principal = Depends(get_current_principal)
):
    frag = q.strip()
    like = f"%{frag.lower()}%"
    import re
    looks_like_icd_code = bool(re.match(r"^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$", frag, flags=re.I))
    looks_like_tm_code = bool(re.match(r"^[A-Z]{1,6}[-_]?[0-9]{1,5}[A-Z0-9]*$", frag, flags=re.I))

    # 1. Direct ICD match (code or name) => expand all its mappings as suggestions
    icd_anchor_q = db.query(ICD11Code).filter(or_(
        ICD11Code.icd_name.ilike(like),
        ICD11Code.icd_code.ilike(frag if looks_like_icd_code else like)
    )).limit(10).all()

    suggestions: list[LookupSuggestion] = []
    if icd_anchor_q:
        icd_ids = [c.id for c in icd_anchor_q]
        mapped = db.query(Mapping).join(TraditionalTerm).filter(Mapping.status=='verified', Mapping.icd11_code_id.in_(icd_ids)).join(ICD11Code).options(joinedload(Mapping.traditional_term), joinedload(Mapping.icd11_code)).all()
        by_icd: dict[str, list[Mapping]] = defaultdict(list)
        for m in mapped: by_icd[m.icd11_code.icd_name].append(m)
        for icd_name, maps in by_icd.items():
            # Add ICD anchor suggestion (single) – user can choose it directly
            suggestions.append(LookupSuggestion(kind='icd', icd_name=icd_name))
            for m in maps:
                td = m.traditional_term
                suggestions.append(LookupSuggestion(kind='traditional', icd_name=icd_name, system=td.system, term=td.term, code=td.code, is_primary=m.is_primary))
        # If we already satisfied limit return early (trim)
        if len(suggestions) >= limit:
            return suggestions[:limit]

    # 2. Traditional term/code fragment (if not already captured above sufficiently)
    if len(suggestions) < limit:
        tt_like = or_(
            TraditionalTerm.term.ilike(like),
            TraditionalTerm.devanagari.ilike(like),
            TraditionalTerm.tamil.ilike(like),
            TraditionalTerm.arabic.ilike(like),
            TraditionalTerm.code.ilike(frag if looks_like_tm_code else like)
        )
        tt_filters = [Mapping.status=='verified', tt_like]
        if system: tt_filters.append(TraditionalTerm.system==system.lower())
        tt_rows = db.query(Mapping).join(TraditionalTerm).join(ICD11Code).filter(*tt_filters) \
            .options(joinedload(Mapping.traditional_term), joinedload(Mapping.icd11_code)).limit(limit*2).all()
        seen_tm: set[tuple[str,str|None]] = set()
        for m in tt_rows:
            td = m.traditional_term
            key = (td.term, td.code, td.system)
            if key in seen_tm: continue
            seen_tm.add(key)
            suggestions.append(LookupSuggestion(kind='traditional', icd_name=m.icd11_code.icd_name, system=td.system, term=td.term, code=td.code, is_primary=m.is_primary))
            if len(suggestions) >= limit:
                break

    # 3. Snapshot fallback if still empty
    if not suggestions and include_snapshot:
        latest_rel = db.query(ConceptMapRelease).order_by(ConceptMapRelease.created_at.desc()).first()
        if latest_rel:
            el_q = db.query(ConceptMapElement).filter(ConceptMapElement.release_id==latest_rel.id)
            el_filters = or_(ConceptMapElement.icd_name.ilike(like), ConceptMapElement.icd_code.ilike(like), ConceptMapElement.term.ilike(like))
            if system:
                el_q = el_q.filter(ConceptMapElement.system==system.lower())
            els = el_q.filter(el_filters).limit(limit*2).all()
            seen: set[tuple[str,str,str]] = set()
            for el in els:
                anchor_key = (el.icd_name, el.term, el.system)
                if anchor_key in seen: continue
                seen.add(anchor_key)
                suggestions.append(LookupSuggestion(kind='snapshot', icd_name=el.icd_name, system=el.system, term=el.term, code=None, is_primary=el.is_primary))
                if len(suggestions) >= limit:
                    break
    return suggestions[:limit]