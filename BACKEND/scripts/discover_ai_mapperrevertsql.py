# File: scripts/discover_ai_mappings.py
# FINAL CORRECTED VERSION - Fixes case-sensitivity bug

import pandas as pd
import os
import json
import numpy as np

# --- DB IMPORTS ---
import sys
sys.path.append(os.getcwd())
from app.db.session import SessionLocal
from app.db.models import ICD11Code, TraditionalTerm, Mapping
# --- END DB IMPORTS ---

def discover_ai_mappings():
    """
    Processes raw AI suggestions, transforms them, and INSERTS them directly
    into the PostgreSQL database with standardized lowercase system names.
    """
    # --- This initial data processing part remains the same ---
    DATA_PATH = "data/processed"
    DATA_PATH2 = "data/source2"
    SOURCE_DATA_PATH = "data/source"
    SUGGESTED_MAPPINGS_FILE = os.path.join(DATA_PATH2, "suggested_mappings_actual.csv")
    SOURCE_FILES = {
        "Ayurveda": os.path.join(SOURCE_DATA_PATH, "NATIONAL AYURVEDA MORBIDITY CODES.xls"),
        "Siddha": os.path.join(SOURCE_DATA_PATH, "NATIONAL SIDDHA MORBIDITY CODES.xls"),
        "Unani": os.path.join(SOURCE_DATA_PATH, "NATIONAL UNANI MORBIDITY CODES.xls")
    }
    
    print("Starting AI mapping discovery...")
    if not os.path.exists(SUGGESTED_MAPPINGS_FILE):
        print(f"Error: {SUGGESTED_MAPPINGS_FILE} not found.")
        return

    suggested_df = pd.read_csv(SUGGESTED_MAPPINGS_FILE)
    source_dfs = {}
    for system, path in SOURCE_FILES.items():
        if os.path.exists(path):
            try:
                df = pd.read_excel(path)
                df['source_row'] = df.index + 2
                source_dfs[system] = df
            except Exception as e:
                print(f"Warning: Could not read source file {path}: {e}")
                continue

    merged_data = []
    for _, row in suggested_df.iterrows():
        system = row['source_system']
        code = row['source_code']
        new_row = row.to_dict()
        new_row['native_term'] = ""
        new_row['source_description'] = "Not Found in Source File"
        new_row['source_row_num'] = None
        if system in source_dfs:
            source_df = source_dfs[system]
            cols = {}
            if system == 'Ayurveda': cols = {'code': 'NAMC_CODE', 'def': 'Long_definition', 'native': 'NAMC_term_DEVANAGARI'}
            elif system == 'Siddha': cols = {'code': 'NSMC_CODE', 'def': 'Long_definition', 'native': 'Tamil_term'}
            elif system == 'Unani': cols = {'code': 'NUMC_CODE', 'def': 'Long_definition', 'native': 'Arabic_term'}
            if cols and cols['code'] in source_df.columns:
                match = source_df[source_df[cols['code']].astype(str) == str(code)]
                if not match.empty:
                    new_row['source_description'] = match.iloc[0].get(cols['def'], "N/A")
                    new_row['source_row_num'] = match.iloc[0]['source_row']
                    new_row['native_term'] = match.iloc[0].get(cols['native'], "")
        merged_data.append(new_row)

    merged_df = pd.DataFrame(merged_data).replace({np.nan: None})
    print("Grouping suggestions by ICD name...")

    db = SessionLocal()
    try:
        icd_cache = {}
        term_cache = {}
        
        print("Writing suggestions to the database...")
        for icd_name, group in merged_df.groupby('suggested_icd_name'):
            if not icd_name: continue

            if icd_name not in icd_cache:
                icd_code_obj = db.query(ICD11Code).filter(ICD11Code.icd_name == icd_name).first()
                if not icd_code_obj:
                    icd_code_obj = ICD11Code(icd_name=icd_name, status='Pending')
                    db.add(icd_code_obj)
                    db.flush()
                icd_cache[icd_name] = icd_code_obj
            icd_code_obj = icd_cache[icd_name]

            for _, suggestion_row in group.iterrows():
                system = suggestion_row.get('source_system')
                term_name = suggestion_row.get('source_term')
                term_code = suggestion_row.get('source_code')
                
                if not system or not term_name or not term_code: continue

                # --- THE FIX IS HERE ---
                # We standardize the system name to lowercase before using it.
                system_lower = system.lower()
                # --- END OF FIX ---

                term_key = (system_lower, term_name, term_code)
                if term_key not in term_cache:
                    term_obj = db.query(TraditionalTerm).filter_by(system=system_lower, term=term_name, code=term_code).first()
                    if not term_obj:
                        term_obj = TraditionalTerm(
                            system=system_lower, # Use the lowercase version
                            term=term_name,
                            code=term_code,
                            source_description=suggestion_row.get('source_description'),
                            source_row=int(suggestion_row['source_row_num']) if suggestion_row['source_row_num'] is not None else None,
                            devanagari=suggestion_row.get('native_term') if system == 'Ayurveda' else None,
                            tamil=suggestion_row.get('native_term') if system == 'Siddha' else None,
                            arabic=suggestion_row.get('native_term') if system == 'Unani' else None
                        )
                        db.add(term_obj)
                        db.flush()
                    term_cache[term_key] = term_obj
                term_obj = term_cache[term_key]
                
                existing_mapping = db.query(Mapping).filter_by(icd11_code_id=icd_code_obj.id, traditional_term_id=term_obj.id).first()
                if not existing_mapping:
                    confidence_str = str(suggestion_row.get('confidence_score', '')).strip().replace('%', '')
                    confidence_int = int(confidence_str) if confidence_str.isdigit() else None
                    new_mapping = Mapping(
                        icd11_code_id=icd_code_obj.id,
                        traditional_term_id=term_obj.id,
                        status='suggested',
                        is_primary=False,
                        ai_justification=suggestion_row.get('justification'),
                        ai_confidence=confidence_int
                    )
                    db.add(new_mapping)
        
        print("Committing all new records to the database...")
        db.commit()
        print(f"Database successfully populated with suggestions.")

    except Exception as e:
        print(f"An error occurred during database operation: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    discover_ai_mappings()