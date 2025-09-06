import pandas as pd
import sys
import os
from sqlalchemy.orm import Session

# --- Setup Project Path ---
# This allows the script to import modules from the 'src' directory
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

# This script only needs the model and session to manage data
from src.db.session import SessionLocal
from src.db.models import Terminology

# --- Configuration ---
DATA_DIR = os.path.join(project_root, 'data')
MASTER_MAP_FILE = os.path.join(DATA_DIR, 'master_concept_map.csv')
AYURVEDA_FILE = os.path.join(DATA_DIR, 'NATIONAL AYURVEDA MORBIDITY CODES.xls')
SIDDHA_FILE = os.path.join(DATA_DIR, 'NATIONAL SIDDHA MORBIDITY CODES.xls')
UNANI_FILE = os.path.join(DATA_DIR, 'NATIONAL UNANI MORBIDITY CODES.xls')

def clean_column_names(df):
    """Standardizes column names for easier processing."""
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
    return df

def get_ayurveda_details(df_ayurveda, code):
    """Extracts term and description from the Ayurveda dataframe."""
    row = df_ayurveda[df_ayurveda['namc_code'] == code]
    if not row.empty:
        term = row.iloc[0].get('namc_term_diacritical', row.iloc[0].get('namc_term'))
        description = row.iloc[0].get('long_definition', row.iloc[0].get('short_definition'))
        return term, description
    return None, None

def get_siddha_details(df_siddha, code):
    """Extracts term and description from the Siddha dataframe."""
    row = df_siddha[df_siddha['namc_code'] == code]
    if not row.empty:
        term = row.iloc[0].get('namc_term')
        description = row.iloc[0].get('long_definition', row.iloc[0].get('short_definition'))
        return term, description
    return None, None

def get_unani_details(df_unani, code):
    """Extracts term and description from the Unani dataframe."""
    row = df_unani[df_unani['numc_code'] == code]
    if not row.empty:
        term = row.iloc[0].get('numc_term')
        description = row.iloc[0].get('long_definition', row.iloc[0].get('short_definition'))
        return term, description
    return None, None

def ingest_data():
    """
    Main function to orchestrate the data ingestion process.
    This script now ASSUMES the database tables have already been created by `init_db.py`.
    Its only job is to:
    1. Read all source files.
    2. Clear existing data from the terminologies table.
    3. Populate the table with fresh data from the files.
    """
    print("Starting intelligent data ingestion...")
    db: Session = SessionLocal()

    try:
        # Load all data sources
        df_map = pd.read_csv(MASTER_MAP_FILE)
        df_ayurveda = clean_column_names(pd.read_excel(AYURVEDA_FILE))
        df_siddha = clean_column_names(pd.read_excel(SIDDHA_FILE))
        df_unani = clean_column_names(pd.read_excel(UNANI_FILE))
        print("  -> All source files loaded successfully.")

        # --- THE FIX ---
        # This script no longer manages the database schema (no drop/create).
        # It now safely deletes existing data from the table before inserting the new set.
        # This assumes init_db.py has already been run to create the table.
        print("Clearing old data from 'terminologies' table...")
        #db.query(Terminology).delete()
        #db.commit()
        print("  -> Old data cleared.")

        all_new_terms = []
        
        # Iterate over the master map to build our new terminology list
        for _, row in df_map.iterrows():
            concept = row['concept_name']
            
            # Process Ayurveda
            if pd.notna(row['ayurveda_code']):
                ayur_code = row['ayurveda_code']
                ayur_term, ayur_desc = get_ayurveda_details(df_ayurveda, ayur_code)
                if ayur_term:
                    all_new_terms.append(Terminology(
                        concept_name=concept, code=ayur_code, term=ayur_term, 
                        system='Ayurveda', description=str(ayur_desc) if pd.notna(ayur_desc) else None
                    ))

            # Process Siddha
            if pd.notna(row['siddha_code']):
                siddha_code = row['siddha_code']
                siddha_term, siddha_desc = get_siddha_details(df_siddha, siddha_code)
                if siddha_term:
                     all_new_terms.append(Terminology(
                        concept_name=concept, code=siddha_code, term=siddha_term, 
                        system='Siddha', description=str(siddha_desc) if pd.notna(siddha_desc) else None
                    ))

            # Process Unani
            if pd.notna(row['unani_code']):
                unani_code = row['unani_code']
                unani_term, unani_desc = get_unani_details(df_unani, unani_code)
                if unani_term:
                     all_new_terms.append(Terminology(
                        concept_name=concept, code=unani_code, term=unani_term, 
                        system='Unani', description=str(unani_desc) if pd.notna(unani_desc) else None
                    ))

        # Bulk insert all new terms into the database
        if all_new_terms:
            db.add_all(all_new_terms)
            db.commit()
            print(f"\nSuccessfully ingested {len(all_new_terms)} terms for {len(df_map)} concepts.")
        else:
            print("\nNo new terms were processed.")

    except Exception as e:
        print(f"\nAn error occurred: {e}")
        db.rollback()
    finally:
        db.close()
        print("Data ingestion process finished.")

if __name__ == "__main__":
    ingest_data()

