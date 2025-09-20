# File: app/api/endpoints/lookup.py
# DEFINITIVE VERSION with correct data structure

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.core.security import get_current_principal
from app.db.models import Mapping, TraditionalTerm, ICD11Code
from typing import List
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

# --- Router Definition ---

router = APIRouter()

@router.get("/lookup", response_model=List[LookupResult])
async def lookup_term(
    query: str = Query(..., min_length=2, description="Search across ICD-11 names/codes and traditional names/codes."),
    system: str | None = Query(None, description="Optional system hint (ayurveda|siddha|unani)."),
    db: Session = Depends(get_db),
    principal = Depends(get_current_principal)
):
    """
    Unified lookup: accepts ICD code/name or traditional code/name (any system).
    Behavior:
    - If query looks like a NAMASTE code (e.g., ABC-123), search TraditionalTerm.code.
    - Else try exact ICD code match if pattern like A00.0 etc., then ICD name like.
    - Else do broad LIKE across traditional term names and ICD names.
    Always returns ICD-centric grouping with verified mappings, acting as an 'expand' as well.
    """
    q = query.strip()
    search_like = f"%{q.lower()}%"

    # Detect patterns
    import re
    looks_like_tm_code = bool(re.match(r"^[A-Z]{2,5}-?\d+[A-Z0-9]*$", q, flags=re.I))
    looks_like_icd_code = bool(re.match(r"^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$", q, flags=re.I))

    matching_icd_ids_q = db.query(Mapping.icd11_code_id).join(TraditionalTerm).filter(Mapping.status == 'verified')

    if looks_like_tm_code:
        # Optional system hint narrows the search
        filters = [TraditionalTerm.code.ilike(q)]
        if system:
            filters.append(TraditionalTerm.system == system.lower())
        matching_icd_ids_q = matching_icd_ids_q.filter(and_(*filters))
    elif looks_like_icd_code:
        # Join to ICD by code value
        matching_icd_ids_q = (
            db.query(ICD11Code.id)
            .filter(or_(ICD11Code.icd_code.ilike(q), ICD11Code.icd_name.ilike(search_like)))
        )
    else:
        # Broad LIKE across traditional names/vernacular and ICD names
        matching_icd_ids_q = matching_icd_ids_q.filter(
            or_(
                TraditionalTerm.term.ilike(search_like),
                TraditionalTerm.source_description.ilike(search_like),
                TraditionalTerm.source_short_definition.ilike(search_like),
                TraditionalTerm.source_long_definition.ilike(search_like),
                TraditionalTerm.devanagari.ilike(search_like),
                TraditionalTerm.tamil.ilike(search_like),
                TraditionalTerm.arabic.ilike(search_like),
            )
        )

    matching_ids_raw = matching_icd_ids_q.distinct().limit(25).all()

    if not matching_ids_raw:
        return []
    # Normalize ids list whether it came from Mapping join or ICD query
    icd_ids = [row[0] for row in matching_ids_raw]

    # 2. Fetch ALL verified mappings for those specific ICD codes
    all_relevant_mappings = (
        db.query(Mapping)
        .filter(Mapping.icd11_code_id.in_(icd_ids), Mapping.status == 'verified')
        .options(
            joinedload(Mapping.traditional_term),
            joinedload(Mapping.icd11_code)
        )
        .all()
    )

    # 3. Process the results in Python to build the correct nested structure
    results_dict = defaultdict(lambda: {"system_mappings": defaultdict(lambda: {"primary": None, "aliases": []})})

    def format_term(term_obj: TraditionalTerm) -> dict:
        return {
            "term": term_obj.term, "code": term_obj.code,
            "source_description": term_obj.source_description,
            "vernacular": term_obj.devanagari or term_obj.tamil or term_obj.arabic
        }

    for mapping in all_relevant_mappings:
        icd_name = mapping.icd11_code.icd_name
        results_dict[icd_name]['icd_description'] = mapping.icd11_code.description
        
        term = mapping.traditional_term
        system = term.system
        
        formatted_term = format_term(term)
        
        if mapping.is_primary:
            results_dict[icd_name]['system_mappings'][system]['primary'] = formatted_term
        else:
            results_dict[icd_name]['system_mappings'][system]['aliases'].append(formatted_term)
            
    # 4. Convert the processed dictionary into the final Pydantic model list
    final_results = []
    for icd_name, data in results_dict.items():
        system_mappings_list = []
        for system, mapping_data in data['system_mappings'].items():
            system_mappings_list.append(SystemMapping(
                system=system,
                primary_term=mapping_data['primary'],
                aliases=mapping_data['aliases']
            ))
        
        final_results.append(LookupResult(
            icd_name=icd_name,
            icd_description=data['icd_description'],
            system_mappings=system_mappings_list
        ))

    return final_results