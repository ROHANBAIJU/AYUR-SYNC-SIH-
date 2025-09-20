# FILE: scripts/migrate_csv_to_db.py

import os
import pandas as pd
import json
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

import sys
sys.path.append(os.getcwd())

from app.db.models import Base, ICD11Code, TraditionalTerm, Mapping

# --- SETUP ---
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file. Please ensure it's set.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DATA_PATH = "data/processed"
AI_SUGGESTIONS_FILE = os.path.join(DATA_PATH, "ai_mapped_suggestions.csv")
CURATION_IN_PROGRESS_FILE = os.path.join(DATA_PATH, "curation_in_progress.csv") 
REJECTED_MAPPINGS_FILE = os.path.join(DATA_PATH, "rejected_mappings.csv")
NO_MAPPING_FILE = os.path.join(DATA_PATH, "no_mapping.csv")
ICD_MASTER_LIST_FILE = os.path.join(DATA_PATH, "icd_master_list.csv")

def read_csv_data(file_path: str):
    if not os.path.exists(file_path):
        print(f"Warning: File not found at {file_path}. Skipping.")
        return []
    try:
        return pd.read_csv(file_path, dtype=str).fillna('').to_dict('records')
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []

def get_suggestion_id(suggestion: dict) -> str:
    if not suggestion or not suggestion.get('term') or not suggestion.get('code'):
        return ""
    base_id = f"{suggestion['term']}-{suggestion['code']}"
    return re.sub(r'[^a-zA-Z0-9]', '-', base_id)

def migrate_data():
    db = SessionLocal()
    
    try:
        print("--- Starting Data Migration ---")

        # Step 1: MIGRATE ICD-11 CODES
        print("\nStep 1: Migrating ICD-11 codes from icd_master_list.csv...")
        icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
        icd_map = {}
        for record in icd_master_list:
            icd_name = record.get('icd_name')
            if icd_name:
                existing_code = db.query(ICD11Code).filter(ICD11Code.icd_name == icd_name).first()
                if not existing_code:
                    new_code = ICD11Code(icd_name=icd_name, description=record.get('description', ''), status=record.get('status', 'Orphaned'))
                    db.add(new_code)
        db.commit()
        print(f"Finished migrating {len(icd_master_list)} ICD-11 code records.")
        for code in db.query(ICD11Code).all():
            icd_map[code.icd_name] = code.id

        # Step 2: MIGRATE TRADITIONAL TERMS
        print("\nStep 2: Consolidating and migrating all traditional terms...")
        term_map = {}
        processed_terms = set()
        files_with_terms = {
            "suggested": read_csv_data(AI_SUGGESTIONS_FILE),
            "staged": read_csv_data(CURATION_IN_PROGRESS_FILE),
            "rejected_correction": read_csv_data(REJECTED_MAPPINGS_FILE),
            "rejected_orphan": read_csv_data(NO_MAPPING_FILE),
        }
        term_count = 0
        for source, data in files_with_terms.items():
            for row in data:
                for system in ['ayurveda', 'siddha', 'unani']:
                    suggestions_str = ""
                    if source == "suggested":
                        suggestions_str = row.get(f'{system}_suggestions', '[]')
                    elif source == "staged":
                        mapping_data = json.loads(row.get(f'{system}_mapping', '{}'))
                        term_list = []
                        if mapping_data.get('primary'): term_list.append(mapping_data['primary'])
                        if mapping_data.get('aliases'): term_list.extend(mapping_data['aliases'])
                        suggestions_str = json.dumps(term_list)
                    elif source in ["rejected_correction", "rejected_orphan"]:
                        if row.get('system') == system:
                            suggestions_str = json.dumps([row])
                    try:
                        suggestions = json.loads(suggestions_str)
                        for term_data in suggestions:
                            term_key = (system, term_data.get('term'), term_data.get('code'))
                            if all(term_key) and term_key not in processed_terms:
                                new_term = TraditionalTerm(system=system, term=term_data.get('term'), code=term_data.get('code'), source_description=term_data.get('source_description'), devanagari=term_data.get('devanagari'), tamil=term_data.get('tamil'), arabic=term_data.get('arabic'), source_row=term_data.get('source_row'))
                                db.add(new_term)
                                processed_terms.add(term_key)
                                term_count += 1
                    except (json.JSONDecodeError, TypeError):
                        continue
        db.commit()
        print(f"Finished migrating {term_count} unique traditional terms.")
        for term in db.query(TraditionalTerm).all():
            term_map[(term.system, term.term, term.code)] = term.id

        # Step 3: MIGRATE MAPPINGS
        print("\nStep 3: Creating mappings between ICD codes and traditional terms...")
        mapping_count = 0
        for source, data in files_with_terms.items():
            for row in data:
                icd_name = row.get('suggested_icd_name') or row.get('original_icd_name')
                if not icd_name: continue
                icd_id = icd_map.get(icd_name)
                if not icd_id: continue

                for system in ['ayurveda', 'siddha', 'unani']:
                    term_list = []
                    is_primary_info = {}
                    if source == "suggested":
                        term_list = json.loads(row.get(f'{system}_suggestions', '[]'))
                    elif source == "staged":
                        mapping_data = json.loads(row.get(f'{system}_mapping', '{}'))
                        if mapping_data.get('primary'):
                            primary_term = mapping_data['primary']
                            term_list.append(primary_term)
                            is_primary_info[get_suggestion_id(primary_term)] = True
                        if mapping_data.get('aliases'):
                            term_list.extend(mapping_data['aliases'])
                    elif source in ["rejected_correction", "rejected_orphan"]:
                        if row.get('system') == system:
                            term_list.append(row)
                    
                    for term_data in term_list:
                        term_id = term_map.get((system, term_data.get('term'), term_data.get('code')))
                        if not term_id: continue
                        
                        existing_mapping = db.query(Mapping).filter_by(icd11_code_id=icd_id, traditional_term_id=term_id).first()
                        if not existing_mapping:
                            # --- THIS IS THE FIX ---
                            # Clean the confidence string before converting to an integer
                            confidence_str = term_data.get('confidence', '0').replace('%', '').strip()
                            try:
                                confidence_int = int(confidence_str)
                            except (ValueError, TypeError):
                                confidence_int = 0 # Default to 0 if it's not a valid number
                            
                            new_mapping = Mapping(
                                icd11_code_id=icd_id,
                                traditional_term_id=term_id,
                                status=source,
                                is_primary=is_primary_info.get(get_suggestion_id(term_data), False),
                                ai_justification=term_data.get('justification'),
                                ai_confidence=confidence_int # Use the cleaned integer here
                            )
                            db.add(new_mapping)
                            mapping_count += 1
        db.commit()
        print(f"Finished creating {mapping_count} new mappings.")

        print("\n--- Data Migration Complete! ---")

    except Exception as e:
        print(f"\nAn error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()