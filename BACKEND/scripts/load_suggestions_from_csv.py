# File: scripts/load_suggestions_from_csv.py

import os
import pandas as pd
import json
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import ICD11Code, TraditionalTerm, Mapping

"""
Robust loader for pre-generated AI suggestions CSV that can be shipped with the image.

Path resolution order (first existing file wins):
1) Environment variable SUGGESTIONS_CSV_PATH (absolute or relative to /app)
2) data/source3/ai_mapped_suggestions.csv
3) data/processed/ai_mapped_suggestions.csv
4) data/source2/ai_mapped_suggestions.csv
"""

DEFAULT_CANDIDATE_PATHS = [
    "data/source3/ai_mapped_suggestions.csv",
    "data/processed/ai_mapped_suggestions.csv",
    "data/source2/ai_mapped_suggestions.csv",
]

def _resolve_csv_path() -> str | None:
    # 1) Env override
    env_path = os.getenv("SUGGESTIONS_CSV_PATH")
    if env_path:
        if os.path.isabs(env_path) and os.path.exists(env_path):
            return env_path
        # Treat as relative to current working directory
        rel_path = os.path.abspath(env_path)
        if os.path.exists(rel_path):
            return rel_path
    # 2) Fallback candidates
    for p in DEFAULT_CANDIDATE_PATHS:
        if os.path.exists(p):
            return p
    return None

def load_suggestions():
    """
    Reads the pre-generated CSV, processes its contents, and populates the database.
    """
    source_csv_path = _resolve_csv_path()
    if not source_csv_path:
        print("-> No suggestions CSV found in any known location. Aborting load.")
        return

    print(f"-> Loading suggestions from: {source_csv_path}")
    db: Session = SessionLocal()
    
    # Use caches to avoid redundant database queries
    icd_cache = {}
    term_cache = {}

    try:
        df = pd.read_csv(source_csv_path).fillna('')
        
        for index, row in df.iterrows():
            icd_name = row.get("suggested_icd_name")
            if not icd_name:
                continue

            # --- Find or Create ICD11Code ---
            if icd_name not in icd_cache:
                icd_obj = db.query(ICD11Code).filter_by(icd_name=icd_name).first()
                if not icd_obj:
                    icd_obj = ICD11Code(icd_name=icd_name)
                    db.add(icd_obj)
                    db.flush() # Flush to get the new ID
                icd_cache[icd_name] = icd_obj
            icd_obj = icd_cache[icd_name]

            # --- Process each system's suggestions ---
            for system in ['ayurveda', 'siddha', 'unani']:
                suggestions_str = row.get(f"{system}_suggestions", "[]")
                if not suggestions_str or suggestions_str == "[]":
                    continue
                
                try:
                    suggestions_list = json.loads(suggestions_str)
                    for term_data in suggestions_list:
                        term_name = term_data.get("term")
                        term_code = term_data.get("code")
                        if not term_name or not term_code:
                            continue

                        # --- Find or Create TraditionalTerm ---
                        term_key = (system, term_name, term_code)
                        if term_key not in term_cache:
                            term_obj = db.query(TraditionalTerm).filter_by(system=system, term=term_name, code=term_code).first()
                            if not term_obj:
                                term_obj = TraditionalTerm(
                                    system=system,
                                    term=term_name,
                                    code=term_code,
                                    source_description=term_data.get('source_description'),
                                    source_short_definition=term_data.get('source_short_definition'),
                                    source_long_definition=term_data.get('source_long_definition'),
                                    devanagari=term_data.get('devanagari'),
                                    tamil=term_data.get('tamil'),
                                    arabic=term_data.get('arabic')
                                )
                                db.add(term_obj)
                                db.flush() # Flush to get new ID
                            term_cache[term_key] = term_obj
                        term_obj = term_cache[term_key]

                        # --- Create the 'suggested' Mapping ---
                        # We assume a mapping doesn't exist since we just cleared the table
                        new_mapping = Mapping(
                            icd11_code_id=icd_obj.id,
                            traditional_term_id=term_obj.id,
                            status='suggested',
                            is_primary=False,
                            ai_justification=term_data.get('justification'),
                            ai_confidence=term_data.get('confidence')
                        )
                        db.add(new_mapping)

                except json.JSONDecodeError:
                    print(f"Warning: Could not parse JSON for {icd_name} in {system} system.")
                    continue
        
        db.commit()
        print(f"✅ Successfully loaded {len(df)} rows from CSV into the database.")

    except Exception as e:
        print(f"❌ An error occurred during CSV loading: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # This allows you to run the script directly for testing if needed
    load_suggestions()