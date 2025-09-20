# File: scripts/ingestion_script.py
# This script is the first step in our workflow. It reads the source
# Excel files for Ayurveda, Siddha, and Unani, sends the data for each
# row to the Gemini API to get an initial ICD-11 mapping suggestion,
# and saves these suggestions in batches to a new CSV file.

import os
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
import time
import json

# --- CONFIGURATION ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# UPDATED: Changed filenames to point to the .xls files
SOURCE_FILES = {
    'Ayurveda': 'data/source/NATIONAL AYURVEDA MORBIDITY CODES.xls',
    'Siddha': 'data/source/NATIONAL SIDDHA MORBIDITY CODES.xls',
    'Unani': 'data/source/NATIONAL UNANI MORBIDITY CODES.xls'
}
OUTPUT_FILE = 'data/source2/suggested_mappings_actual.csv'
BATCH_SIZE = 10
MODEL_NAME = 'gemini-1.5-flash' # Using a powerful and efficient model

# --- GEMINI API SETUP ---
generation_config = {
  "temperature": 0.2,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}

safety_settings = [
  {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
  {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

def get_gemini_model():
    """Initializes and returns the Gemini model instance."""
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        safety_settings=safety_settings,
        generation_config=generation_config
    )

def create_prompt(row_data, system_name):
    """Creates a detailed prompt for the Gemini API based on row data."""
    prompt = f"""
    You are an expert medical coder specializing in mapping traditional medicine terminologies to the International Classification of Diseases (ICD-11).
    Your task is to analyze the provided data for a single concept from the '{system_name}' system of medicine and suggest the most likely ICD-11 mapping.

    Analyze the following data:
    {row_data}

    Based on the data, provide your expert suggestion for the corresponding ICD-11 code.
    Your response MUST be a single, valid JSON object with the following exact keys:
    - "suggested_icd_name": The most probable ICD-11 term (e.g., "Migraine").
    - "confidence_score": An estimated percentage (e.g., "75%") representing your confidence in this mapping.
    - "justification": A brief, clear explanation for your choice, referencing the source data.

    Example Response:
    {{
      "suggested_icd_name": "Functional abdominal bloating",
      "confidence_score": "60%",
      "justification": "The source term 'vAtasa~jcayaH' and its description mentioning 'fullness of abdomen' aligns reasonably with symptoms of functional bloating, although the Ayurvedic concept is broader."
    }}

    Now, provide the JSON object for the data provided above.
    """
    return prompt

def process_files():
    """
    Main function to process all source files, get suggestions from Gemini,
    and save them to the output file.
    """
    all_suggestions = []
    model = get_gemini_model()
    
    # Ensure the output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # Initialize output file with headers
    output_df = pd.DataFrame(columns=[
        'source_system', 'source_code', 'source_term', 'suggested_icd_name',
        'confidence_score', 'justification', 'original_data'
    ])
    output_df.to_csv(OUTPUT_FILE, index=False, mode='w') # 'w' for write mode to create/overwrite

    total_rows_processed = 0

    for system, filepath in SOURCE_FILES.items():
        print(f"\n--- Processing {system} file: {filepath} ---")
        try:
            # UPDATED: Changed from read_csv to read_excel
            # Make sure you have 'xlrd' installed: pip install xlrd
            df = pd.read_excel(filepath)
            batch_suggestions = []

            for index, row in df.iterrows():
                start_time = time.time()
                total_rows_processed += 1
                
                # Determine source code and term based on file type
                # Note: Column names might be slightly different in XLS files.
                # Please verify the column names in your actual files.
                if system == 'Ayurveda':
                    source_code = row.get('NAMC_CODE', 'N/A')
                    source_term = row.get('NAMC_term', 'N/A')
                elif system == 'Siddha':
                    # Assuming similar column names for Siddha
                    source_code = row.get('NAMC_CODE', 'N/A')
                    source_term = row.get('NAMC_TERM', 'N/A')
                elif system == 'Unani':
                    source_code = row.get('NUMC_CODE', 'N/A')
                    source_term = row.get('NUMC_TERM', 'N/A')
                else:
                    source_code = 'N/A'
                    source_term = 'N/A'

                row_data_str = ', '.join([f'"{k}":"{v}"' for k, v in row.dropna().items()])
                prompt = create_prompt(f"{{{row_data_str}}}", system)

                try:
                    response = model.generate_content(prompt)
                    suggestion = json.loads(response.text)
                    
                    suggestion_data = {
                        'source_system': system,
                        'source_code': source_code,
                        'source_term': source_term,
                        'suggested_icd_name': suggestion.get('suggested_icd_name'),
                        'confidence_score': suggestion.get('confidence_score'),
                        'justification': suggestion.get('justification'),
                        'original_data': row.to_json() # Store original row for context
                    }
                    batch_suggestions.append(suggestion_data)
                    
                    duration = time.time() - start_time
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Processed row {total_rows_processed} ({system} #{index + 1}) in {duration:.2f}s. Suggestion: '{suggestion.get('suggested_icd_name')}'")

                except (json.JSONDecodeError, AttributeError, ValueError) as e:
                    print(f"[ERROR] Failed to parse Gemini response for row {total_rows_processed}. Error: {e}. Response Text: {response.text if 'response' in locals() else 'N/A'}")
                    continue # Skip to the next row
                except Exception as e:
                    print(f"[ERROR] An unexpected error occurred at row {total_rows_processed}: {e}")
                    time.sleep(5) # Wait before retrying
                    continue

                # Save to CSV in batches
                if len(batch_suggestions) >= BATCH_SIZE:
                    pd.DataFrame(batch_suggestions).to_csv(OUTPUT_FILE, mode='a', header=False, index=False)
                    print(f"\n--- Saved batch of {len(batch_suggestions)} suggestions to {OUTPUT_FILE} ---\n")
                    batch_suggestions = []

            # Save any remaining suggestions in the last batch
            if batch_suggestions:
                pd.DataFrame(batch_suggestions).to_csv(OUTPUT_FILE, mode='a', header=False, index=False)
                print(f"\n--- Saved final batch of {len(batch_suggestions)} suggestions from {system} to {OUTPUT_FILE} ---\n")

        except FileNotFoundError:
            print(f"[ERROR] File not found: {filepath}")
            print("Please ensure the .xls files are in the 'data/source' directory.")
        except Exception as e:
            print(f"[ERROR] Failed to process file {filepath}: {e}")

    print(f"\n--- Ingestion complete. All suggestions saved to {OUTPUT_FILE} ---")

if __name__ == "__main__":
    process_files()