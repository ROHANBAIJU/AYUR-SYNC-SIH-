# File: discover_mappings.py
# This version groups suggestions into a nested JSON format and replaces NaN
# values with None to ensure the output is valid JSON.

import pandas as pd
import os
import csv
import json
import numpy as np 

def discover_ai_mappings():
    """
    Processes the raw AI suggestions and transforms them into a structured CSV
    where suggestions for each system are grouped into a JSON string.
    """
    # Define file paths within the function to make it self-contained
    DATA_PATH = "data/processed"
    DATA_PATH2 = "data/source2"
    SOURCE_DATA_PATH = "data/source"
    SUGGESTED_MAPPINGS_FILE = os.path.join(DATA_PATH2, "suggested_mappings_actual.csv")
    AI_SUGGESTIONS_FILE = os.path.join(DATA_PATH, "ai_mapped_suggestions.csv")
    SOURCE_FILES = {
        "Ayurveda": os.path.join(SOURCE_DATA_PATH, "NATIONAL AYURVEDA MORBIDITY CODES.xls"),
        "Siddha": os.path.join(SOURCE_DATA_PATH, "NATIONAL SIDDHA MORBIDITY CODES.xls"),
        "Unani": os.path.join(SOURCE_DATA_PATH, "NATIONAL UNANI MORBIDITY CODES.xls")
    }
    
    print("Starting AI mapping discovery...")
    if not os.path.exists(SUGGESTED_MAPPINGS_FILE):
        print(f"Error: {SUGGESTED_MAPPINGS_FILE} not found.")
        return

    # 1. Load all necessary dataframes
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

    # 2. Merge source file details (like descriptions) into the suggestions
    merged_data = []
    for _, row in suggested_df.iterrows():
        system = row['source_system']
        code = row['source_code']
        new_row = row.to_dict()
        new_row['native_term'] = ""
        new_row['source_description'] = "Not Found in Source File"
        new_row['source_row_num'] = "N/A"
        if system in source_dfs:
            source_df = source_dfs[system]
            cols = {}
            if system == 'Ayurveda':
                cols = {'code': 'NAMC_CODE', 'def': 'Long_definition', 'native': 'NAMC_term_DEVANAGARI'}
            elif system == 'Siddha':
                cols = {'code': 'NAMC_CODE', 'def': 'Long_definition', 'native': 'Tamil_term'}
            elif system == 'Unani':
                cols = {'code': 'NUMC_CODE', 'def': 'Long_definition', 'native': 'Arabic_term'}
            if cols and cols['code'] in source_df.columns:
                match = source_df[source_df[cols['code']].astype(str) == str(code)]
                if not match.empty:
                    new_row['source_description'] = match.iloc[0].get(cols['def'], "N/A")
                    new_row['source_row_num'] = match.iloc[0]['source_row']
                    new_row['native_term'] = match.iloc[0].get(cols['native'], "")
        merged_data.append(new_row)

    merged_df = pd.DataFrame(merged_data)

    # Replace all occurrences of numpy's NaN with Python's None.
    # json.dumps will convert None to the valid JSON value 'null'.
    merged_df = merged_df.replace({np.nan: None})
    
    print("Grouping suggestions by ICD name...")
    final_data = []
    for icd_name, group in merged_df.groupby('suggested_icd_name'):
        new_row_data = {
            'suggested_icd_name': icd_name,
            'ayurveda_suggestions': [],
            'siddha_suggestions': [],
            'unani_suggestions': []
        }
        for _, suggestion_row in group.iterrows():
            system = suggestion_row['source_system']
            suggestion_object = {
                'term': suggestion_row.get('source_term'),
                'code': suggestion_row.get('source_code'),
                'justification': suggestion_row.get('justification'),
                'confidence': suggestion_row.get('confidence_score'),
                'source_description': suggestion_row.get('source_description'),
                'source_row': suggestion_row.get('source_row_num'),
                'devanagari': suggestion_row.get('native_term') if system == 'Ayurveda' else '',
                'tamil': suggestion_row.get('native_term') if system == 'Siddha' else '',
                'arabic': suggestion_row.get('native_term') if system == 'Unani' else ''
            }
            if system == 'Ayurveda':
                new_row_data['ayurveda_suggestions'].append(suggestion_object)
            elif system == 'Siddha':
                new_row_data['siddha_suggestions'].append(suggestion_object)
            elif system == 'Unani':
                new_row_data['unani_suggestions'].append(suggestion_object)
        
        new_row_data['ayurveda_suggestions'] = json.dumps(new_row_data['ayurveda_suggestions'])
        new_row_data['siddha_suggestions'] = json.dumps(new_row_data['siddha_suggestions'])
        new_row_data['unani_suggestions'] = json.dumps(new_row_data['unani_suggestions'])
        
        final_data.append(new_row_data)

    final_df = pd.DataFrame(final_data)
    final_headers = ['suggested_icd_name', 'ayurveda_suggestions', 'siddha_suggestions', 'unani_suggestions']
    final_df = final_df.reindex(columns=final_headers)
    
    final_df.to_csv(AI_SUGGESTIONS_FILE, index=False, quoting=csv.QUOTE_ALL)
    print(f"Successfully generated {AI_SUGGESTIONS_FILE} with {len(final_df)} entries.")

if __name__ == "__main__":
    discover_ai_mappings()