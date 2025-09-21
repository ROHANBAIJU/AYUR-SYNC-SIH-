# File: app/api/endpoints/admin.py
# FINAL, COMPLETE, AND UNABRIDGED VERSION

import csv
import os
import time
import requests
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict, Any
from pydantic import BaseModel
import pandas as pd
import json
from dotenv import load_dotenv
import google.generativeai as genai

from app.core.security import get_current_user
from app.services import who_api_client
from scripts.discover_ai_mappings import discover_ai_mappings
import re # Make sure to import 're' at the top of admin.py
from app.db.session import get_db
from app.db.models import ICD11Code, TraditionalTerm, Mapping, DiagnosisEvent
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, cast, String, and_
#from sqlalchemy.dialects.postgresql import json_agg
from sqlalchemy.dialects.postgresql import JSONB

# --- Load Environment Variables & Configure APIs ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
WHO_API_CLIENT_ID = os.getenv("WHO_API_CLIENT_ID")
WHO_API_CLIENT_SECRET = os.getenv("WHO_API_CLIENT_SECRET")
WHO_TOKEN_URL = os.getenv("WHO_TOKEN_URL")
WHO_API_BASE_URL = os.getenv("WHO_API_BASE_URL")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")
genai.configure(api_key=GEMINI_API_KEY)

# --- Pydantic Models ---
class CurationPayload(BaseModel):
    icd_name: str
    statuses: Dict[str, Any]

class RejectedUpdatePayload(BaseModel):
    original_icd_name: str
    new_icd_name: str
    system: str
    term: str
    
    
# Add this with the other Pydantic models near the top of admin.py

class UndoPayload(BaseModel):
    icd_name: str
    
        
class MasterUpdatePayload(BaseModel):
    icd_name: str
    system: str
    mapping: Dict[str, Any]

class AIVerifyPayload(BaseModel):
    icd_name: str
    mapping: Dict[str, Any]

class RevertPayload(BaseModel):
    icd_name: str

class ICDAddPayload(BaseModel):
    icd_name: str
    description: str

class ManualMappingPayload(BaseModel):
    icd_name: str
    system: str
    mapping: Dict[str, Any]
    destination: str

class RemapTermPayload(BaseModel):
    term_data: Dict[str, Any]
    old_icd_name: str
    new_icd_name: str
    target_system: str

class ReCurationPayload(BaseModel):
    new_icd_name: str
    original_icd_name: str
    system: str
    term_data: Dict[str, Any]

class DescriptionFetchPayload(BaseModel):
    icd_name: str

class AIFetchPayload(BaseModel):
    icd_name: str
    who_description: str
    
    
# Add this new Pydantic model at the top with the others
class RemapPayload(BaseModel):
    rejected_term_data: Dict[str, Any]
    destination_icd_name: str
    is_new_icd: bool


class EnrichICDPayload(BaseModel):
    icd_name: str
    release: str | None = None


# --- File Paths ---
DATA_PATH = "data/processed"
DATA_PATH2 = "data/source2"
AI_SUGGESTIONS_FILE = os.path.join(DATA_PATH, "ai_mapped_suggestions.csv")
CURATION_IN_PROGRESS_FILE = os.path.join(DATA_PATH, "curation_in_progress.csv") 
REJECTED_MAPPINGS_FILE = os.path.join(DATA_PATH, "rejected_mappings.csv")
VERIFIED_MAPPINGS_FILE = os.path.join(DATA_PATH, "verified_mappings.csv")
NO_MAPPING_FILE = os.path.join(DATA_PATH, "no_mapping.csv")
REVIEW_NEEDED_FILE = os.path.join(DATA_PATH, "review_needed.csv")
ICD_MASTER_LIST_FILE = os.path.join(DATA_PATH, "icd_master_list.csv")
LOCK_DIR = os.path.join(DATA_PATH, "locks")

# --- Headers ---
SUGGESTION_HEADERS = ['suggested_icd_name', 'ayurveda_suggestions', 'siddha_suggestions', 'unani_suggestions']
CURATION_HEADERS = [ "suggested_icd_name", "ayurveda_mapping", "siddha_mapping", "unani_mapping" ]
VERIFIED_HEADERS = ["suggested_icd_name","ayurveda_code","ayurveda_term","siddha_code","siddha_term","unani_code","unani_term"]
REJECTED_HEADERS = ["original_icd_name","system","code","term","source_description","justification","source_row","confidence", "devanagari", "tamil", "arabic"]
NO_MAPPING_HEADERS = REJECTED_HEADERS
REVIEW_HEADERS = REJECTED_HEADERS
ICD_MASTER_HEADERS = ["icd_name", "description", "status", "who_description", "ai_description", "ai_confidence"]

router = APIRouter()

# --- Helper Functions & Startup ---


def get_suggestion_id(suggestion: Dict) -> str:
    """Generates a consistent, safe ID for a suggestion object."""
    if not suggestion or not suggestion.get('term') or not suggestion.get('code'):
        return ""
    base_id = f"{suggestion['term']}-{suggestion['code']}"
    return re.sub(r'[^a-zA-Z0-9]', '-', base_id)




def initialize_csv(file_path, headers):
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

def initialize_system():
    os.makedirs(DATA_PATH, exist_ok=True)
    os.makedirs(LOCK_DIR, exist_ok=True)
    initialize_csv(AI_SUGGESTIONS_FILE, SUGGESTION_HEADERS)
    initialize_csv(CURATION_IN_PROGRESS_FILE, CURATION_HEADERS)
    initialize_csv(REJECTED_MAPPINGS_FILE, REJECTED_HEADERS)
    initialize_csv(VERIFIED_MAPPINGS_FILE, VERIFIED_HEADERS)
    initialize_csv(NO_MAPPING_FILE, NO_MAPPING_HEADERS)
    initialize_csv(REVIEW_NEEDED_FILE, REVIEW_HEADERS)
    initialize_csv(ICD_MASTER_LIST_FILE, ICD_MASTER_HEADERS)

def _on_startup(func): func()
@_on_startup
def startup_event():
    initialize_system()

def read_csv_data(file_path: str) -> List[Dict]:
    if not os.path.exists(file_path): return []
    try:
        return pd.read_csv(file_path, dtype=str).fillna('').to_dict('records')
    except Exception: return []

def write_csv_data(file_path: str, data: List[Dict], headers: List[str]):
    try:
        df = pd.DataFrame(data)
        for header in headers:
            if header not in df.columns:
                df[header] = ''
        df[headers].to_csv(file_path, index=False, quoting=csv.QUOTE_ALL)
    except Exception as e:
        print(f"Error writing to {file_path}: {e}")

def get_who_api_token():
    if not WHO_API_CLIENT_ID or not WHO_API_CLIENT_SECRET:
        print("WHO API credentials not found in .env file. Skipping token fetch.")
        return None
    try:
        payload = {
            'client_id': WHO_API_CLIENT_ID, 'client_secret': WHO_API_CLIENT_SECRET,
            'grant_type': 'client_credentials', 'scope': 'icdapi_access'
        }
        r = requests.post(WHO_TOKEN_URL, data=payload, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        r.raise_for_status()
        return r.json().get('access_token')
    except requests.exceptions.RequestException as e:
        print(f"Error fetching WHO API token: {e}")
        return None

# --- Analytics helpers: read access.log JSONL ---
def _read_access_log(limit: int | None = None) -> list[dict]:
    path = "/app/logs/access.log"
    rows: list[dict] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            if limit:
                # read last N lines efficiently
                from collections import deque
                dq = deque(f, maxlen=limit)
                lines = list(dq)
            else:
                lines = f.readlines()
        import json as _json
        for line in lines:
            try:
                rows.append(_json.loads(line))
            except Exception:
                continue
    except FileNotFoundError:
        pass
    return rows

@router.get("/analytics/summary")
def analytics_summary():
    rows = _read_access_log()
    total = len(rows)
    by_status = {}
    by_method = {}
    total_duration = 0
    for r in rows:
        s = str(r.get("status"))
        by_status[s] = by_status.get(s, 0) + 1
        m = r.get("method") or ""
        by_method[m] = by_method.get(m, 0) + 1
        total_duration += int(r.get("duration_ms") or 0)
    avg_latency_ms = int(total_duration / total) if total else 0
    return {"total": total, "by_status": by_status, "by_method": by_method, "avg_latency_ms": avg_latency_ms}

@router.get("/analytics/timeseries")
def analytics_timeseries(bucket: str = "minute", limit: int = 1440):
    # bucket can be 'minute' or 'hour'
    import datetime as dt
    rows = _read_access_log()
    series = {}
    for r in rows:
        try:
            ts = dt.datetime.fromisoformat(r.get("ts").replace("Z", "+00:00"))
        except Exception:
            continue
        if bucket == "hour":
            key = ts.strftime("%Y-%m-%d %H:00")
        else:
            key = ts.strftime("%Y-%m-%d %H:%M")
        d = series.get(key)
        if not d:
            d = {"count": 0, "avg_latency_ms": 0, "_sum": 0}
            series[key] = d
        d["count"] += 1
        d["_sum"] += int(r.get("duration_ms") or 0)
    # finalize avg and sort
    items = []
    for k, v in series.items():
        avg = int(v["_sum"] / v["count"]) if v["count"] else 0
        items.append({"bucket": k, "count": v["count"], "avg_latency_ms": avg})
    items.sort(key=lambda x: x["bucket"])  # chronological
    if limit and len(items) > limit:
        items = items[-limit:]
    return items

@router.get("/analytics/recent")
def analytics_recent(limit: int = 100):
    rows = _read_access_log(limit=limit)
    return rows

@router.get("/analytics/paths")
def analytics_by_path():
    rows = _read_access_log()
    stats = {}
    for r in rows:
        p = r.get("path") or ""
        s = stats.get(p)
        if not s:
            s = {"count": 0, "avg_latency_ms": 0, "_sum": 0, "status": {}}
            stats[p] = s
        s["count"] += 1
        s["_sum"] += int(r.get("duration_ms") or 0)
        st = str(r.get("status"))
        s["status"][st] = s["status"].get(st, 0) + 1
    # finalize avg
    for s in stats.values():
        s["avg_latency_ms"] = int(s["_sum"] / s["count"]) if s["count"] else 0
        s.pop("_sum", None)
    return stats

# --- MAP ANALYTICS: Clusters and Details ---
@router.get("/analytics/map/clusters")
def analytics_map_clusters(
    bbox: str,  # "minLon,minLat,maxLon,maxLat"
    zoom: int = 5,
    system: str | None = None,
    date_from: str | None = None,  # ISO date
    date_to: str | None = None,    # ISO date
    db: Session = Depends(get_db)
):
    """
    Returns clustered counts within the given bounding box using a simple grid-based
    clustering by rounding lat/lon to a precision based on zoom.
    """
    try:
        parts = [float(x) for x in bbox.split(',')]
        if len(parts) != 4:
            raise ValueError
        min_lon, min_lat, max_lon, max_lat = parts
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bbox; expected 'minLon,minLat,maxLon,maxLat'")

    # Grid scale heuristic by zoom: larger scale means finer grid
    if zoom <= 3:
        scale = 1.0  # ~1 degree
    elif zoom <= 5:
        scale = 10.0  # 0.1 deg
    elif zoom <= 8:
        scale = 100.0  # 0.01 deg
    elif zoom <= 11:
        scale = 1000.0  # 0.001 deg
    else:
        scale = 10000.0  # 0.0001 deg

    # Use floor(lat*scale)/scale to bucket consistently in Postgres
    lat_bucket = (func.floor(DiagnosisEvent.latitude * scale) / scale).label('lat')
    lng_bucket = (func.floor(DiagnosisEvent.longitude * scale) / scale).label('lng')

    q = db.query(
        lat_bucket,
        lng_bucket,
        func.count().label('count'),
        func.array_agg(DiagnosisEvent.icd_name).label('icd_names')
    ).filter(
        DiagnosisEvent.latitude >= min_lat,
        DiagnosisEvent.latitude <= max_lat,
        DiagnosisEvent.longitude >= min_lon,
        DiagnosisEvent.longitude <= max_lon,
    )

    if system:
        q = q.filter(DiagnosisEvent.system == system.lower())
    if date_from:
        q = q.filter(func.date(DiagnosisEvent.created_at) >= date_from)
    if date_to:
        q = q.filter(func.date(DiagnosisEvent.created_at) <= date_to)

    try:
        rows = (
            q.group_by(lat_bucket, lng_bucket)
             .order_by(lat_bucket, lng_bucket)
             .all()
        )
    except Exception as e:
        # If the table doesn't exist yet (first boot), return empty clusters gracefully
        msg = str(e).lower()
        if 'undefinedtable' in msg or 'does not exist' in msg:
            return {"clusters": []}
        raise
    clusters = []
    from collections import Counter
    for r in rows:
        names = list(r.icd_names or [])
        top = []
        if names:
            c = Counter(names)
            top = [{"name": n, "count": cnt} for n, cnt in c.most_common(3)]
        clusters.append({
            "lat": float(r.lat),
            "lng": float(r.lng),
            "count": int(r.count),
            "top": top,
        })
    return {"clusters": clusters}


@router.get("/analytics/map/details")
def analytics_map_details(
    lat: float,
    lng: float,
    tolerance: float = 0.01,
    system: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Returns detailed events around a point (lat,lng) within a tolerance radius (box).
    """
    q = db.query(DiagnosisEvent).filter(
        DiagnosisEvent.latitude.between(lat - tolerance, lat + tolerance),
        DiagnosisEvent.longitude.between(lng - tolerance, lng + tolerance)
    )
    if system:
        q = q.filter(DiagnosisEvent.system == system.lower())
    if date_from:
        q = q.filter(func.date(DiagnosisEvent.created_at) >= date_from)
    if date_to:
        q = q.filter(func.date(DiagnosisEvent.created_at) <= date_to)

    rows = q.order_by(DiagnosisEvent.created_at.desc()).limit(200).all()
    # Aggregate per doctor and diagnosis
    by_doctor = {}
    for e in rows:
        key = e.doctor_id or 'unknown'
        d = by_doctor.get(key)
        if not d:
            d = {"doctor_id": key, "events": []}
            by_doctor[key] = d
        d["events"].append({
            "icd_name": e.icd_name,
            "system": e.system,
            "code": e.code,
            "term_name": e.term_name,
            "city": e.city,
            "state": e.state,
            "lat": e.latitude,
            "lng": e.longitude,
            "ts": e.created_at.isoformat() if e.created_at else None
        })

    from collections import Counter
    diag_counts = Counter([e.icd_name for e in rows])
    top_diags = [{"name": n, "count": c} for n, c in diag_counts.most_common(10)]

    return {"doctors": list(by_doctor.values()), "topDiagnoses": top_diags, "total": len(rows)}

def get_gemini_verification(icd_name: str, mapping_data: Dict) -> Dict:
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    term = mapping_data.get("primary", {}).get("term", "N/A")
    desc = mapping_data.get("primary", {}).get("source_description", "N/A")
    if term == "N/A" or desc == "N/A":
        return {"justification": "Term and Source Description must be provided for AI verification.", "confidence": 0}
    prompt = f"""
    You are an expert in medical terminology. Evaluate how well the provided traditional medicine term maps to the given ICD-11 diagnosis based on its source description.
    Provide a concise justification and a confidence score from 0 to 100.
    
    - ICD-11 Diagnosis: "{icd_name}"
    - Traditional Term: "{term}"
    - Source Description: "{desc}"

    Your response MUST be a valid JSON object with ONLY two keys: "justification" (string) and "confidence" (integer).
    Example: {{"justification": "The description aligns well.", "confidence": 88}}
    """
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_response)
    except Exception as e:
        return {"justification": f"AI analysis failed: {e}", "confidence": 0}

"""
def run_reset_process():
    files_to_clear = [f for f in os.listdir(DATA_PATH) if f.endswith('.csv')]
    for f in files_to_clear:
        try: os.remove(os.path.join(DATA_PATH, f))
        except OSError as e: print(f"Error removing file {f}: {e}")
    initialize_system()
    try:
        print("Starting AI mapping discovery...")
        discover_ai_mappings()
        print("AI mapping discovery finished.")
    except Exception as e:
        print(f"Failed to regenerate suggestions. Error: {e}")
"""
# FILE: app/api/endpoints/admin.py

# In app/api/endpoints/admin.py

# Make sure these are imported at the top of the file
from app.db.session import SessionLocal
from app.db.models import Mapping, TraditionalTerm, ICD11Code

# ... other imports ...

# (Find and replace the old run_reset_process function with this)
"""
def run_reset_process():
    
    #DB-DRIVEN RESET: Wipes the relevant database tables and then runs the
    #discover_ai_mappings script to repopulate them from scratch.
    
    db = SessionLocal()
    try:
        print("--- Initiating Database Reset ---")
        
        # 1. Delete existing data from tables in the correct order
        print("Clearing Mappings table...")
        db.query(Mapping).delete(synchronize_session=False)
        
        print("Clearing Traditional Terms table...")
        db.query(TraditionalTerm).delete(synchronize_session=False)
        
        print("Clearing ICD-11 Codes table...")
        db.query(ICD11Code).delete(synchronize_session=False)
        
        db.commit()
        print("Database tables cleared successfully.")

        # 2. Run the ingestion script to repopulate the database
        print("Starting AI mapping discovery to repopulate database...")
        discover_ai_mappings()  # This now writes directly to the DB
        print("Database repopulation complete.")

    except Exception as e:
        print(f"An error occurred during the reset process: {e}")
        db.rollback()
    finally:
        db.close()
        
"""
# FILE: app/api/endpoints/admin.py

# Replace the entire old run_reset_process function with this safer version.
# FILE: app/api/endpoints/admin.py

# Add this new temporary function to the BOTTOM of the file for debugging.

@router.get("/debug-statuses")
def debug_statuses(db: Session = Depends(get_db)):
    """
    TEMPORARY ENDPOINT: Fetches the first 10 statuses directly from the
    mappings table to verify the result of the reset process.
    """
    print("\n--- FETCHING FIRST 10 MAPPING STATUSES ---")
    
    # Query the database for the status of the first 10 mappings found.
    results = db.query(Mapping.status).limit(10).all()
    
    # The query returns a list of tuples, so we flatten it.
    statuses = [status for (status,) in results]
    
    print(f"-> Found statuses: {statuses}")
    
    return {"first_10_statuses_in_mappings_table": statuses}
##(OGGGGG)
"""
def run_reset_process():
    
    #DB-DRIVEN RESET (SAFE VERSION): Wipes only the mappings and traditional terms,
    #preserving the master ICD-11 code list. It then runs the discover_ai_mappings
    #script to repopulate the necessary tables from scratch.
    
    db = SessionLocal()
    try:
        print("\n--- Initiating Curation Reset (Safe Mode) ---")
        
        # 1. Delete all existing mappings. This resets all curation progress.
        print("Clearing Mappings table...")
        mappings_deleted = db.query(Mapping).delete(synchronize_session=False)
        print(f"-> {mappings_deleted} old mappings deleted.")
        
        # 2. Delete all existing traditional terms, as they will be re-discovered.
        print("Clearing Traditional Terms table...")
        terms_deleted = db.query(TraditionalTerm).delete(synchronize_session=False)
        print(f"-> {terms_deleted} old traditional terms deleted.")
        
        # IMPORTANT: We are INTENTIONALLY NOT deleting from the ICD11Code table
        # to preserve any manually added codes or verified descriptions.
        
        db.commit()
        print("✅ Old curation data cleared successfully.")

        # 3. Run the ingestion script to repopulate the database with fresh suggestions.
        print("\nStarting AI mapping discovery to repopulate database...")
        discover_ai_mappings()  # This re-creates terms and 'suggested' mappings.
        print("✅ Database repopulation complete.")

    except Exception as e:
        print(f"❌ An error occurred during the reset process: {e}")
        db.rollback()
    finally:
        db.close()

"""
# Add these imports at the top of the file if they aren't already there
import os
from scripts.discover_ai_mappings import discover_ai_mappings
from scripts.load_suggestions_from_csv import load_suggestions # <-- Add this new import

# ... other code ...

# (Find and replace the existing run_reset_process function with this)
def run_reset_process():
    """
    DB-DRIVEN RESET (ENHANCED): Wipes mappings and terms, then repopulates them.
    It first checks for a pre-generated CSV in data/source3/ to use as a fast path.
    If not found, it falls back to running the original discovery script.
    """
    db = SessionLocal()
    try:
        print("\n--- Initiating Curation Reset (Safe Mode) ---")
        
        # 1. Delete all existing mappings.
        print("Clearing Mappings table...")
        mappings_deleted = db.query(Mapping).delete(synchronize_session=False)
        print(f"-> {mappings_deleted} old mappings deleted.")
        
        # 2. Delete all existing traditional terms.
        print("Clearing Traditional Terms table...")
        terms_deleted = db.query(TraditionalTerm).delete(synchronize_session=False)
        print(f"-> {terms_deleted} old traditional terms deleted.")
        
        db.commit()
        print("✅ Old curation data cleared successfully.")

        # 3. --- THIS IS YOUR NEW LOGIC ---
        # Check for the fallback file and decide which ingestion method to use.
        fallback_csv_path = "data/source3/ai_mapped_suggestions.csv"
        
        print(f"\nChecking for fallback file at: {fallback_csv_path}")
        if os.path.exists(fallback_csv_path):
            print("✅ Fallback CSV found. Loading suggestions directly from file...")
            load_suggestions() # Run the new, fast loader script
        else:
            print("Fallback CSV not found. Running AI mapping discovery script...")
            discover_ai_mappings() # Run the original, slower discovery script
            
        print("✅ Database repopulation complete.")

    except Exception as e:
        print(f"❌ An error occurred during the reset process: {e}")
        db.rollback()
    finally:
        db.close()



        
# --- Core API Endpoints ---
# Add these two new endpoints to your admin.py file
"""
@router.get("/all-icd-codes-for-search")
def get_all_icd_codes_for_search(user: Any = Depends(get_current_user)):
    
    #Provides a comprehensive, unique, and sorted list of all ICD names 
    #from all relevant data sources for the search dropdowns.
    
    # Use a set to automatically handle duplicates
    all_icd_names = set()

    # 1. Read from the main suggestions workflow
    suggestions_data = read_csv_data(AI_SUGGESTIONS_FILE)
    for item in suggestions_data:
        if item.get("suggested_icd_name"):
            all_icd_names.add(item["suggested_icd_name"])

    # 2. Read from the curated Master Map
    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    for item in master_map_data:
        if item.get("suggested_icd_name"):
            all_icd_names.add(item["suggested_icd_name"])

    # 3. Read from the manually managed Master List (for orphaned/newly added codes)
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
    for item in icd_master_list:
        if item.get("icd_name"):
            all_icd_names.add(item["icd_name"])
            
    # Convert the set to a sorted list and return
    return sorted(list(all_icd_names))
"""

# In app/api/endpoints/admin.py

@router.get("/all-icd-codes-for-search")
def get_all_icd_codes_for_search(db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Provides a comprehensive, unique, and sorted list of all ICD names
    directly from the icd11_codes table for use in search dropdowns.
    """
    # This simple query gets all ICD names from the database
    all_codes_query = db.query(ICD11Code.icd_name).order_by(ICD11Code.icd_name).all()
    
    # The query returns a list of tuples, so we flatten it into a simple list of strings
    return [name for (name,) in all_codes_query]


@router.get("/verified-icd-names")
def get_verified_icd_names(db: Session = Depends(get_db)):
    """
    Returns a simple list of ICD-11 names which currently have at least one
    verified mapping. Useful for indicating what can be translated/lookuped.
    """
    rows = (
        db.query(ICD11Code.icd_name)
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id)
        .filter(Mapping.status == 'verified')
        .distinct()
        .order_by(ICD11Code.icd_name)
        .all()
    )
    return [name for (name,) in rows]




"""
@router.post("/remap-rejected-term")
def remap_rejected_term(payload: RemapPayload, user: Any = Depends(get_current_user)):
    
    #Intelligently remaps a rejected term, performs a new AI analysis on the new mapping,
    # and then saves the enriched data.
    
    term_data = payload.rejected_term_data
    dest_icd = payload.destination_icd_name
    system = term_data.get("system")

    # 1. Remove the term from the correction queue
    correction_queue = read_csv_data(REJECTED_MAPPINGS_FILE)
    updated_queue = [
        item for item in correction_queue 
        if not (item.get("term") == term_data.get("term") and item.get("code") == term_data.get("code"))
    ]
    write_csv_data(REJECTED_MAPPINGS_FILE, updated_queue, REJECTED_HEADERS)

    # 2. Clean up the term data to be re-inserted
    term_for_mapping = {
        key: term_data[key] for key in 
        ["term", "code", "devanagari", "tamil", "arabic", "confidence", "source_description", "justification", "source_row"] 
        if key in term_data
    }

    # --- NEW: Perform Automatic AI Re-analysis ---
    try:
        print(f"Performing AI re-analysis for term '{term_for_mapping.get('term')}' with new ICD '{dest_icd}'...")
        # The AI function expects the term to be nested under a 'primary' key
        ai_payload = {"primary": term_for_mapping}
        ai_result = get_gemini_verification(dest_icd, ai_payload)
        
        # Update the term with the new, relevant analysis
        term_for_mapping['justification'] = ai_result.get('justification', 'AI re-analysis failed.')
        term_for_mapping['confidence'] = ai_result.get('confidence', 0)
        print(f"AI re-analysis complete. New confidence: {ai_result.get('confidence')}%")

    except Exception as e:
        print(f"An error occurred during AI re-analysis: {e}")
        # Assign default values if AI fails, so the remapping process doesn't stop
        term_for_mapping['justification'] = f"AI re-analysis failed to execute."
        term_for_mapping['confidence'] = "0"
    # --- END of New Logic ---

    # 3. Save the newly enriched term to its destination
    if payload.is_new_icd:
        # Create a new ICD and add the term as a new suggestion with primary status
        icd_list = read_csv_data(ICD_MASTER_LIST_FILE)
        if not any(item['icd_name'].lower() == dest_icd.lower() for item in icd_list):
            icd_list.append({"icd_name": dest_icd, "description": "Newly added during re-mapping.", "status": "Pending"})
            write_csv_data(ICD_MASTER_LIST_FILE, icd_list, ICD_MASTER_HEADERS)
        
        suggestions = read_csv_data(AI_SUGGESTIONS_FILE)
        new_suggestion_row = {
            "suggested_icd_name": dest_icd,
            f"{system}_suggestions": json.dumps([term_for_mapping])
        }
        suggestions.append(new_suggestion_row)
        write_csv_data(AI_SUGGESTIONS_FILE, suggestions, SUGGESTION_HEADERS)

    else:
        # Add the term to an existing ICD code
        master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
        master_map_icds = {row.get("suggested_icd_name") for row in master_map_data}

        if dest_icd in master_map_icds:
            # Add to Master Map as primary or alias
            for row in master_map_data:
                if row.get("suggested_icd_name") == dest_icd:
                    mapping_str = row.get(f'{system}_mapping') or '{}'
                    mapping = json.loads(mapping_str)
                    
                    if not mapping.get('primary'):
                        mapping['primary'] = term_for_mapping
                    else:
                        mapping.setdefault('aliases', []).append(term_for_mapping)
                    row[f'{system}_mapping'] = json.dumps(mapping)
                    break
            write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
        else:
            # Add to New Suggestions
            suggestions = read_csv_data(AI_SUGGESTIONS_FILE)
            found = False
            for row in suggestions:
                if row.get("suggested_icd_name") == dest_icd:
                    sugg_list_str = row.get(f'{system}_suggestions') or '[]'
                    sugg_list = json.loads(sugg_list_str)
                    sugg_list.append(term_for_mapping)
                    row[f'{system}_suggestions'] = json.dumps(sugg_list)
                    found = True
                    break
            if not found:
                 suggestions.append({"suggested_icd_name": dest_icd, f'{system}_suggestions': json.dumps([term_for_mapping])})
            write_csv_data(AI_SUGGESTIONS_FILE, suggestions, SUGGESTION_HEADERS)

    return {"status": "success", "message": f"Term '{term_data.get('term')}' successfully remapped with new AI analysis."}

"""


# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py



# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py

@router.post("/remap-rejected-term")
def remap_rejected_term(payload: RemapPayload, db: Session = Depends(get_db)):

    #DB-DRIVEN (DEFINITIVE VERSION): A robust version that correctly handles all 
    #remapping scenarios by checking for pre-existing mappings before creating new ones.
    
    term_data = payload.rejected_term_data
    dest_icd_name = payload.destination_icd_name
    system = term_data.get("system")

    # 1. Find all necessary DB objects
    term_obj = db.query(TraditionalTerm).filter_by(system=system, term=term_data.get("term"), code=term_data.get("code")).first()
    original_icd_obj = db.query(ICD11Code).filter_by(icd_name=term_data.get("original_icd_name")).first()
    dest_icd_obj = db.query(ICD11Code).filter_by(icd_name=dest_icd_name).first()

    if not term_obj or not original_icd_obj:
        raise HTTPException(status_code=404, detail="Original rejected term or ICD code not found.")
    
    if not dest_icd_obj:
        if payload.is_new_icd:
            dest_icd_obj = ICD11Code(icd_name=dest_icd_name, description="Newly added during re-mapping.", status="Pending")
            db.add(dest_icd_obj)
            db.flush()
        else:
            raise HTTPException(status_code=404, detail=f"Destination ICD code '{dest_icd_name}' not found.")

    # 2. Delete the old, incorrect 'rejected_correction' mapping
    mapping_to_delete = db.query(Mapping).filter_by(traditional_term_id=term_obj.id, icd11_code_id=original_icd_obj.id, status='rejected_correction').first()
    if mapping_to_delete:
        db.delete(mapping_to_delete)
        db.flush() # Flush the deletion to ensure it's processed before we continue

    # 3. --- THIS IS THE NEW "UPSERT" LOGIC ---
    # Check if a mapping between this term and the destination already exists (e.g., as 'suggested')
    mapping_to_update = db.query(Mapping).filter_by(
        traditional_term_id=term_obj.id,
        icd11_code_id=dest_icd_obj.id
    ).first()

    if not mapping_to_update:
        # If no mapping exists, create a brand new one.
        mapping_to_update = Mapping(
            traditional_term_id=term_obj.id,
            icd11_code_id=dest_icd_obj.id
        )
        db.add(mapping_to_update)

    # 4. Now, determine the correct status and primary flag for the mapping
    destination_in_master_map = db.query(Mapping).filter(Mapping.icd11_code_id == dest_icd_obj.id, Mapping.status == 'staged').first() is not None

    if not destination_in_master_map:
        mapping_to_update.status = 'suggested'
        mapping_to_update.is_primary = False
    else:
        mapping_to_update.status = 'staged'
        primary_exists_for_system = db.query(Mapping).join(TraditionalTerm).filter(
            Mapping.icd11_code_id == dest_icd_obj.id,
            TraditionalTerm.system == system,
            Mapping.status == 'staged',
            Mapping.is_primary == True
        ).first() is not None
        mapping_to_update.is_primary = not primary_exists_for_system

    # 5. Perform AI Re-analysis on the mapping we are creating or updating
    try:
        ai_payload = {"primary": term_data}
        ai_result = get_gemini_verification(dest_icd_name, ai_payload)
        mapping_to_update.ai_justification = ai_result.get('justification', 'AI re-analysis failed.')
        mapping_to_update.ai_confidence = ai_result.get('confidence', 0)
    except Exception as e:
        mapping_to_update.ai_justification = "AI re-analysis failed to execute."
        mapping_to_update.ai_confidence = 0
    
    db.commit()
    return {"status": "success", "message": f"Term '{term_data.get('term')}' successfully remapped."}

# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py
"""
@router.post("/remap-rejected-term")
def remap_rejected_term(payload: RemapPayload, db: Session = Depends(get_db)):
    
    #DB-DRIVEN (DEFINITIVE REWRITE): A clean, robust version that correctly handles
    #all 4 specified remapping scenarios by updating mappings in place.
    
    term_data = payload.rejected_term_data
    dest_icd_name = payload.destination_icd_name
    system = term_data.get("system")

    # 1. Find all necessary DB objects
    term_obj = db.query(TraditionalTerm).filter_by(system=system, term=term_data.get("term"), code=term_data.get("code")).first()
    original_icd_obj = db.query(ICD11Code).filter_by(icd_name=term_data.get("original_icd_name")).first()
    dest_icd_obj = db.query(ICD11Code).filter_by(icd_name=dest_icd_name).first()

    if not term_obj or not original_icd_obj:
        raise HTTPException(status_code=404, detail="Original rejected term or ICD code not found.")
    
    if not dest_icd_obj and not payload.is_new_icd:
         raise HTTPException(status_code=404, detail=f"Destination ICD code '{dest_icd_name}' not found.")

    # 2. Find the rejected mapping that needs to be moved.
    mapping_to_move = db.query(Mapping).filter_by(
        traditional_term_id=term_obj.id,
        icd11_code_id=original_icd_obj.id,
        status='rejected_correction'
    ).first()

    if not mapping_to_move:
        raise HTTPException(status_code=404, detail="Could not find the rejected mapping to move. It might have been remapped already.")

    # 3. Handle case where destination ICD is new
    if not dest_icd_obj and payload.is_new_icd:
        dest_icd_obj = ICD11Code(icd_name=dest_icd_name, description="Newly added during re-mapping.")
        db.add(dest_icd_obj)
        db.flush() # Ensure the new ICD gets an ID

    # 4. Check if a mapping for this term *already exists* at the destination
    existing_dest_mapping = db.query(Mapping).filter_by(
        traditional_term_id=term_obj.id,
        icd11_code_id=dest_icd_obj.id
    ).first()

    if existing_dest_mapping:
        # If a link already exists (e.g., it was a 'suggested' mapping before),
        # we will update this existing link and delete the old rejected one.
        db.delete(mapping_to_move)
        mapping_to_update = existing_dest_mapping
    else:
        # If no link exists, we will simply "move" the rejected mapping by updating it.
        mapping_to_update = mapping_to_move

    # 5. Determine the destination's state and apply the correct logic from your 4 cases
    destination_in_master_map = db.query(Mapping).filter(
        Mapping.icd11_code_id == dest_icd_obj.id, Mapping.status == 'staged'
    ).first() is not None

    if destination_in_master_map:
        ## BRANCH 1: Destination is in the Master Map ##
        mapping_to_update.status = 'staged'
        primary_exists_for_system = db.query(Mapping).join(TraditionalTerm).filter(
            Mapping.icd11_code_id == dest_icd_obj.id, TraditionalTerm.system == system,
            Mapping.status == 'staged', Mapping.is_primary == True
        ).first() is not None
        
        if primary_exists_for_system:
            # Case 1: Becomes an alias
            mapping_to_update.is_primary = False
        else:
            # Case 2: Becomes the new primary
            mapping_to_update.is_primary = True
    else:
        ## BRANCH 2: Destination is in New Suggestions (or is brand new) ##
        # This covers both cases 3 and 4
        mapping_to_update.status = 'suggested'
        mapping_to_update.is_primary = False # is_primary is always false for suggestions
        
    # 6. Point the mapping to its new home and run AI analysis
    mapping_to_update.icd11_code_id = dest_icd_obj.id
    try:
        ai_payload = {"primary": term_data}
        ai_result = get_gemini_verification(dest_icd_name, ai_payload)
        mapping_to_update.ai_justification = ai_result.get('justification', 'AI re-analysis failed.')
        mapping_to_update.ai_confidence = ai_result.get('confidence', 0)
    except Exception:
        mapping_to_update.ai_justification = "AI re-analysis failed to execute."
        mapping_to_update.ai_confidence = 0
    
    db.commit()
    return {"status": "success", "message": f"Term '{term_data.get('term')}' successfully remapped."}
"""


@router.post("/reset-curation")
def reset_curation(background_tasks: BackgroundTasks, user: Any = Depends(get_current_user)):
    background_tasks.add_task(run_reset_process)
    return { "status": "success", "message": "Curation reset initiated. The data will refresh automatically." }
    
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Returns counts for the dashboard cards.
    - review: number of ICD codes that currently have at least one 'suggested' mapping
    - master_map: number of ICD codes that currently have at least one 'staged' mapping
    - rejected: total number of rejected mappings (correction + orphan)
    """
    review_count = db.query(func.count(func.distinct(ICD11Code.id))) \
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id) \
        .filter(Mapping.status == 'suggested') \
        .scalar() or 0

    master_map_count = db.query(func.count(func.distinct(ICD11Code.id))) \
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id) \
        .filter(Mapping.status == 'staged') \
        .scalar() or 0

    master_map_verified = db.query(func.count(func.distinct(ICD11Code.id))) \
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id) \
        .filter(Mapping.status == 'verified') \
        .scalar() or 0

    rejected_count = db.query(Mapping) \
        .filter(Mapping.status.in_(['rejected_correction', 'rejected_orphan'])) \
        .count()

    return {
        "review": int(review_count),
        "master_map": int(master_map_count),
        "master_map_verified": int(master_map_verified),
        "rejected": int(rejected_count)
    }

@router.get("/completeness-stats")
def get_completeness_stats(db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Computes how many suggested ICDs have suggestions from
    3 systems, 2 systems, or 1 system.
    """
    try:
        # Distinct (ICD, system) pairs for suggested mappings
        pairs = (
            db.query(ICD11Code.id, TraditionalTerm.system)
            .join(Mapping, ICD11Code.id == Mapping.icd11_code_id)
            .join(TraditionalTerm, TraditionalTerm.id == Mapping.traditional_term_id)
            .filter(Mapping.status == 'suggested')
            .distinct(ICD11Code.id, TraditionalTerm.system)
            .all()
        )

        system_count_by_icd = {}
        for icd_id, system in pairs:
            if icd_id not in system_count_by_icd:
                system_count_by_icd[icd_id] = set()
            system_count_by_icd[icd_id].add(system)

        three = sum(1 for s in system_count_by_icd.values() if len(s) == 3)
        two = sum(1 for s in system_count_by_icd.values() if len(s) == 2)
        one = sum(1 for s in system_count_by_icd.values() if len(s) == 1)

        return {"three_systems": three, "two_systems": two, "one_system": one}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not calculate stats: {e}")

# (Find and replace the existing /all-suggestions endpoint with this one)
@router.get("/all-suggestions")
def get_all_suggestions(db: Session = Depends(get_db)):
    """
    DB-DRIVEN & CORRECTLY FORMATTED: Fetches all suggestions from the database,
    groups them by ICD-11 code, and casts the JSON suggestions to strings
    to match the format expected by the frontend.
    """
    term_json = func.json_build_object(
        'term', TraditionalTerm.term,
        'code', TraditionalTerm.code,
        'justification', Mapping.ai_justification,
        'confidence', Mapping.ai_confidence,
        'source_description', TraditionalTerm.source_description,
        'source_short_definition', TraditionalTerm.source_short_definition,
        'source_long_definition', TraditionalTerm.source_long_definition,
        'source_row', TraditionalTerm.source_row,
        'devanagari', TraditionalTerm.devanagari,
        'tamil', TraditionalTerm.tamil,
        'arabic', TraditionalTerm.arabic
    ).label('term_object')

    suggestions_query = (
        db.query(
            ICD11Code.icd_name.label("suggested_icd_name"),
            
            # --- THE FIX IS HERE: We cast the JSON array to a String ---
            func.coalesce(
                cast(func.json_agg(term_json).filter(TraditionalTerm.system == 'ayurveda'), String),
                '[]'
            ).label("ayurveda_suggestions"),
            
            func.coalesce(
                cast(func.json_agg(term_json).filter(TraditionalTerm.system == 'siddha'), String),
                '[]'
            ).label("siddha_suggestions"),
            
            func.coalesce(
                cast(func.json_agg(term_json).filter(TraditionalTerm.system == 'unani'), String),
                '[]'
            ).label("unani_suggestions")
            # --- END OF FIX ---
        )
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id)
        .join(TraditionalTerm, Mapping.traditional_term_id == TraditionalTerm.id)
        .filter(Mapping.status == 'suggested')
        .group_by(ICD11Code.icd_name)
        .all()
    )

    return [row._asdict() for row in suggestions_query]


# FILE: admin.py
# FILE: admin.py

# FILE: admin.py


# FILE: admin.py
"""
@router.post("/submit-curation")
def submit_curation(curation_data: List[CurationPayload], user: Any = Depends(get_current_user)):
    all_suggestions = read_csv_data(AI_SUGGESTIONS_FILE)
    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
    rejected_mappings = read_csv_data(REJECTED_MAPPINGS_FILE)
    no_mapping_data = read_csv_data(NO_MAPPING_FILE)
    icds_processed = set()

    for item in curation_data:
        try:
            icd_name = item.icd_name
            icds_processed.add(icd_name)
            
            original_suggestion_row = next((r for r in all_suggestions if r['suggested_icd_name'] == icd_name), None)
            if not original_suggestion_row:
                print(f"Warning: Could not find suggestion row for {icd_name}. Skipping.")
                continue

            approved_golden_record = {}

            for system, decision_obj in item.statuses.items():
                if not decision_obj: continue

                if 'rejected_suggestions' in decision_obj:
                    for rejected in decision_obj['rejected_suggestions']:
                        rejection_reason = rejected.get('reason')
                        data_to_save = {"original_icd_name": icd_name, "system": system, **rejected['suggestion']}
                        if rejection_reason == 'orphan': no_mapping_data.append(data_to_save)
                        else: rejected_mappings.append(data_to_save)

                # --- FIX: Directly use the full objects sent from the frontend ---
                if decision_obj.get('primary') or decision_obj.get('aliases'):
                    primary_obj = decision_obj.get('primary')
                    alias_objs = decision_obj.get('aliases', [])

                    if not primary_obj and alias_objs:
                        primary_obj = alias_objs.pop(0)

                    if primary_obj:
                        final_mapping = {"primary": primary_obj, "aliases": alias_objs}
                        approved_golden_record[f'{system}_mapping'] = json.dumps(final_mapping)
                
                original_suggestion_row[f'{system}_suggestions'] = '[]'

            if approved_golden_record:
                existing_master_row = next((r for r in master_map_data if r.get("suggested_icd_name") == icd_name), None)
                if existing_master_row:
                    existing_master_row.update(approved_golden_record)
                else:
                    master_map_data.append({"suggested_icd_name": icd_name, **approved_golden_record})

        except Exception as e:
            print(f"ERROR: Failed to process curation for '{item.icd_name}'. Reason: {e}")
            continue
    
    final_suggestions = [r for r in all_suggestions if any(r[f'{s}_suggestions'] and r[f'{s}_suggestions'] not in ('[]', '') for s in ['ayurveda', 'siddha', 'unani'])]
    
    suggestion_icds = {row['suggested_icd_name'] for row in final_suggestions}
    master_map_icds = {row['suggested_icd_name'] for row in master_map_data}
    for icd_name in icds_processed:
        if icd_name not in suggestion_icds and icd_name not in master_map_icds:
            for master_item in icd_master_list:
                if master_item['icd_name'] == icd_name:
                    master_item['status'] = 'Orphaned'
                    break
    
    write_csv_data(AI_SUGGESTIONS_FILE, final_suggestions, SUGGESTION_HEADERS)
    write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
    write_csv_data(REJECTED_MAPPINGS_FILE, rejected_mappings, REJECTED_HEADERS)
    write_csv_data(NO_MAPPING_FILE, no_mapping_data, NO_MAPPING_HEADERS)
    write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)
    
    return {"status": "success"}
"""
# (Find and replace the old /submit-curation function with this one)

@router.post("/submit-curation")
def submit_curation(curation_data: List[CurationPayload], db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Processes curation decisions from the frontend and updates the status
    of mappings in the database (from 'suggested' to 'staged' or 'rejected').
    """
    # Use caches to avoid repeatedly querying the database for the same items in a single request
    icd_code_cache = {}
    term_cache = {}

    for item in curation_data:
        try:
            icd_name = item.icd_name
            
            # 1. Get the parent ICD11Code object from the database
            if icd_name not in icd_code_cache:
                icd_code_obj = db.query(ICD11Code).filter(ICD11Code.icd_name == icd_name).first()
                if not icd_code_obj:
                    print(f"Warning: ICD Code '{icd_name}' not found in DB. Skipping.")
                    continue
                icd_code_cache[icd_name] = icd_code_obj
            icd_code_obj = icd_code_cache[icd_name]

            # 2. Process decisions for each system (ayurveda, siddha, unani)
            for system, decision_obj in item.statuses.items():
                if not decision_obj: continue
                
                system = system.lower()

                # Helper function to get a term's mapping from the DB
                def get_mapping(term_data):
                    term_key = (system, term_data['term'], term_data['code'])
                    if term_key not in term_cache:
                        term_obj = db.query(TraditionalTerm).filter_by(
                            system=system, term=term_data['term'], code=term_data['code']
                        ).first()
                        term_cache[term_key] = term_obj
                    
                    term_obj = term_cache[term_key]
                    if not term_obj: return None
                    
                    return db.query(Mapping).filter_by(
                        icd11_code_id=icd_code_obj.id, traditional_term_id=term_obj.id
                    ).first()

                # 3. Handle rejected suggestions
                if 'rejected_suggestions' in decision_obj:
                    for rejected in decision_obj['rejected_suggestions']:
                        mapping_to_update = get_mapping(rejected['suggestion'])
                        if mapping_to_update:
                            rejection_reason = rejected.get('reason')
                            # Update status based on why it was rejected
                            mapping_to_update.status = 'rejected_orphan' if rejection_reason == 'orphan' else 'rejected_correction'
                
                # 4. Handle approved primary mapping
                if decision_obj.get('primary'):
                    mapping_to_update = get_mapping(decision_obj['primary'])
                    if mapping_to_update:
                        mapping_to_update.status = 'staged' # Move to master map
                        mapping_to_update.is_primary = True

                # 5. Handle approved aliases
                if decision_obj.get('aliases'):
                    for alias in decision_obj['aliases']:
                        mapping_to_update = get_mapping(alias)
                        if mapping_to_update:
                            mapping_to_update.status = 'staged' # Move to master map
                            mapping_to_update.is_primary = False
                            
        except Exception as e:
            print(f"ERROR: Failed to process curation for '{item.icd_name}'. Reason: {e}")
            db.rollback() # Rollback on error for this specific ICD group
            continue
            
    # 6. Commit all changes to the database at once
    db.commit()
    return {"status": "success", "message": "Curation saved to database successfully."}

"""
@router.get("/master-map-data")
def get_master_map_data(user: Any = Depends(get_current_user)): return read_csv_data(CURATION_IN_PROGRESS_FILE)
"""

# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py
"""
@router.get("/master-map-data")
def get_master_map_data(db: Session = Depends(get_db)):

   # DB-DRIVEN (CORRECTED): Fetches curated ('staged') mappings and formats them
   # for the Master Map page using a simpler, more robust method.
    
    # 1. Fetch all raw 'staged' mappings from the database
    staged_mappings = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .join(ICD11Code)
        .filter(Mapping.status == 'staged')
        .options(
            joinedload(Mapping.traditional_term),
            joinedload(Mapping.icd11_code)
        )
        .all()
    )

    # 2. Process the flat list of mappings into the nested structure the frontend needs
    master_map = {}
    for mapping in staged_mappings:
        icd_name = mapping.icd11_code.icd_name
        term = mapping.traditional_term
        system = term.system

        # Initialize the entry for this ICD code if it's the first time we've seen it
        if icd_name not in master_map:
            master_map[icd_name] = {
                "suggested_icd_name": icd_name,
                "ayurveda_mapping": None,
                "siddha_mapping": None,
                "unani_mapping": None,
            }
        
        # Initialize the entry for this specific system (e.g., Ayurveda) if needed
        system_key = f"{system}_mapping"
        if not master_map[icd_name][system_key]:
            master_map[icd_name][system_key] = {"primary": None, "aliases": []}

        # Create the term object
        term_obj = {
            'term': term.term, 'code': term.code,
            'justification': mapping.ai_justification, 'confidence': mapping.ai_confidence,
            'source_description': term.source_description, 'source_row': term.source_row,
            'devanagari': term.devanagari, 'tamil': term.tamil, 'arabic': term.arabic
        }

        # Assign the term as either primary or an alias
        if mapping.is_primary:
            master_map[icd_name][system_key]['primary'] = term_obj
        else:
            master_map[icd_name][system_key]['aliases'].append(term_obj)

    # 3. Convert the processed data into the final list format
    results = list(master_map.values())
    
    # 4. Convert the Python dicts back to JSON strings for the frontend
    for row in results:
        for key in ['ayurveda_mapping', 'siddha_mapping', 'unani_mapping']:
            if row[key]:
                row[key] = json.dumps(row[key])
                
    return results

"""

# In app/api/endpoints/admin.py
""""
@router.get("/master-map-data")
def get_master_map_data(db: Session = Depends(get_db)):
    
    #DB-DRIVEN (ENHANCED): Fetches all 'staged' and 'verified' mappings
    #and determines the overall row status for the Master Map page.

    # 1. Fetch all raw mappings that belong on the Master Map
    all_master_mappings = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .join(ICD11Code)
        .filter(Mapping.status.in_(['staged', 'verified'])) # Fetch both statuses
        .options(
            joinedload(Mapping.traditional_term),
            joinedload(Mapping.icd11_code)
        )
        .all()
    )

    # 2. Process into a nested structure
    master_map = {}
    for mapping in all_master_mappings:
        icd_name = mapping.icd11_code.icd_name
        term = mapping.traditional_term
        system = term.system

        if icd_name not in master_map:
            master_map[icd_name] = {
                "suggested_icd_name": icd_name,
                "row_status": "Staged", # Default to Staged
                "ayurveda_mapping": None, "siddha_mapping": None, "unani_mapping": None,
            }
        
        # If any mapping in the group is 'verified', the whole row is considered 'Verified'
        if mapping.status == 'verified':
            master_map[icd_name]["row_status"] = "Verified"

        system_key = f"{system}_mapping"
        if not master_map[icd_name][system_key]:
            master_map[icd_name][system_key] = {"primary": None, "aliases": []}

        term_obj = { 'term': term.term, 'code': term.code, 'justification': mapping.ai_justification,
                     'confidence': mapping.ai_confidence, 'source_description': term.source_description,
                     'source_row': term.source_row, 'devanagari': term.devanagari,
                     'tamil': term.tamil, 'arabic': term.arabic }

        if mapping.is_primary:
            master_map[icd_name][system_key]['primary'] = term_obj
        else:
            master_map[icd_name][system_key]['aliases'].append(term_obj)

    # 3. Final formatting for the frontend
    results = list(master_map.values())
    for row in results:
        for key in ['ayurveda_mapping', 'siddha_mapping', 'unani_mapping']:
            if row[key]:
                row[key] = json.dumps(row[key])
                
    return results
"""

# FILE: app/api/endpoints/admin.py

# Replace the entire old /master-map-data function with this one.

# FILE: app/api/endpoints/admin.py

# Replace the entire old /master-map-data function with this one.
# FILE: app/api/endpoints/admin.py

# Replace the entire old /master-map-data function with this one.

# FILE: app/api/endpoints/admin.py

# Add this import at the top of the file with the other sqlalchemy imports


# Replace the entire old /master-map-data function with this simplified and corrected one.

# FILE: app/api/endpoints/admin.py

# Temporarily replace the get_master_map_data function with this debugging version.

# FILE: app/api/endpoints/admin.py

# Add this import if it's not already at the top of the file
from sqlalchemy.dialects.postgresql import JSONB

# Replace the temporary debug function with this permanent, corrected version.

@router.get("/master-map-data")
def get_master_map_data(db: Session = Depends(get_db)):
    """
    DB-DRIVEN (FINAL CORRECTED VERSION): Correctly aggregates primary and alias
    terms for the master map using robust JSON functions.
    """
    term_json = func.jsonb_build_object(
        'term', TraditionalTerm.term, 'code', TraditionalTerm.code,
        'justification', Mapping.ai_justification, 'confidence', Mapping.ai_confidence,
        'source_description', TraditionalTerm.source_description,
        'source_short_definition', TraditionalTerm.source_short_definition,
        'source_long_definition', TraditionalTerm.source_long_definition,
        'source_row', TraditionalTerm.source_row,
        'devanagari', TraditionalTerm.devanagari, 'tamil', TraditionalTerm.tamil, 'arabic', TraditionalTerm.arabic
    )

    def create_system_mapping(system_name: str):
        primary_term = (
            func.jsonb_agg(term_json).filter(
                Mapping.is_primary == True,
                TraditionalTerm.system == system_name
            )
        ).op('->')(0)
        
        aliases_array = func.coalesce(
            func.jsonb_agg(term_json).filter(
                Mapping.is_primary == False,
                TraditionalTerm.system == system_name
            ), 
            '[]', type_=JSONB
        )
        
        return cast(func.jsonb_build_object(
            'primary', primary_term,
            'aliases', aliases_array
        ), String).label(f'{system_name}_mapping')

    query_result = (
        db.query(
            ICD11Code.icd_name.label("suggested_icd_name"),
            case((func.bool_or(Mapping.status == 'verified'), "Verified"), else_="Staged").label("row_status"),
            create_system_mapping('ayurveda'),
            create_system_mapping('siddha'),
            create_system_mapping('unani')
        )
        .join(Mapping, ICD11Code.id == Mapping.icd11_code_id)
        .join(TraditionalTerm, Mapping.traditional_term_id == TraditionalTerm.id)
        .filter(Mapping.status.in_(['staged', 'verified']))
        .group_by(ICD11Code.icd_name)
        .order_by(ICD11Code.icd_name)
        .all()
    )
    
    return [row._asdict() for row in query_result]

@router.post("/undo-verification")
def undo_verification(payload: UndoPayload, db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Reverts a 'verified' mapping back to 'staged' for a given ICD code.
    """
    icd_code = db.query(ICD11Code).filter(ICD11Code.icd_name == payload.icd_name).first()
    if not icd_code:
        raise HTTPException(status_code=404, detail="ICD Code not found.")

    verified_mappings = db.query(Mapping).filter(
        Mapping.icd11_code_id == icd_code.id,
        Mapping.status == 'verified'
    )

    if verified_mappings.count() == 0:
        raise HTTPException(status_code=400, detail="No verified mappings found for this ICD code to undo.")

    verified_mappings.update({"status": "staged"}, synchronize_session=False)
    db.commit()

    return {"message": f"Verification for '{payload.icd_name}' has been undone."}

# In app/api/endpoints/admin.py

@router.get("/rejected-mappings")
def get_rejected_mappings(db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Fetches all rejected mappings from the database, separating them
    into the 'Correction Queue' and the 'Orphanage'.
    """
    rejected_mappings = (
        db.query(Mapping)
        .join(TraditionalTerm)
        .join(ICD11Code)
        .filter(Mapping.status.in_(['rejected_correction', 'rejected_orphan']))
        .options(
            joinedload(Mapping.traditional_term),
            joinedload(Mapping.icd11_code)
        )
        .all()
    )

    needs_correction = []
    no_mapping = []

    for mapping in rejected_mappings:
        term = mapping.traditional_term
        
        # This structure matches what the rejections.js frontend expects
        term_data = {
            "original_icd_name": mapping.icd11_code.icd_name,
            "system": term.system,
            "term": term.term,
            "code": term.code,
            "source_description": term.source_description,
            "source_short_definition": term.source_short_definition,
            "source_long_definition": term.source_long_definition,
            "devanagari": term.devanagari,
            "tamil": term.tamil,
            "arabic": term.arabic,
            "source_row": term.source_row,
            "justification": mapping.ai_justification,
            "confidence": mapping.ai_confidence
        }
        
        if mapping.status == 'rejected_correction':
            needs_correction.append(term_data)
        else: # 'rejected_orphan'
            no_mapping.append(term_data)
            
    return {"needs_correction": needs_correction, "no_mapping": no_mapping}



"""
@router.post("/commit-to-master")
def commit_to_master(user: Any = Depends(get_current_user)):
    master_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    if not master_data: raise HTTPException(status_code=400, detail="Master map is empty.")
    verified_data = read_csv_data(VERIFIED_MAPPINGS_FILE)
    for row in master_data:
        final_row = {"suggested_icd_name": row.get("suggested_icd_name")}
        for system in ['ayurveda', 'siddha', 'unani']:
            try:
                primary = json.loads(row.get(f'{system}_mapping', '{}')).get('primary')
                if primary: final_row[f'{system}_code'] = primary.get('code'); final_row[f'{system}_term'] = primary.get('term')
            except: continue
        verified_data.append(final_row)
    write_csv_data(VERIFIED_MAPPINGS_FILE, verified_data, VERIFIED_HEADERS)
    initialize_csv(CURATION_IN_PROGRESS_FILE, CURATION_HEADERS)
    return {"status": "success", "message": f"{len(master_data)} mappings committed."}
"""

# In app/api/endpoints/admin.py

@router.post("/commit-to-master")
def commit_to_master(db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Commits all 'staged' mappings by updating their status to 'verified'.
    """
    staged_mappings = db.query(Mapping).filter(Mapping.status == 'staged')
    
    count = staged_mappings.count()
    if count == 0:
        raise HTTPException(status_code=400, detail="No staged mappings to commit.")

    staged_mappings.update({"status": "verified"}, synchronize_session=False)
    db.commit()
    
    return {"message": f"{count} staged mappings have been verified."}




@router.post("/update-rejected-mapping")
def update_rejected_mapping(update_data: RejectedUpdatePayload, user: Any = Depends(get_current_user)):
    correction_queue = read_csv_data(REJECTED_MAPPINGS_FILE)
    item_to_move = next((item for i, item in enumerate(correction_queue) if item.get("original_icd_name") == update_data.original_icd_name and item.get("system") == update_data.system and item.get("term") == update_data.term), None)
    if not item_to_move: raise HTTPException(status_code=404, detail="Original item not found.")
    
    correction_queue = [item for item in correction_queue if item != item_to_move]
    write_csv_data(REJECTED_MAPPINGS_FILE, correction_queue, REJECTED_HEADERS)
    
    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    existing_row = next((row for row in master_map_data if row.get("suggested_icd_name") == update_data.new_icd_name), None)
    mapping_obj = {"primary": {k: item_to_move.get(k, '') for k in ['term', 'code', 'source_description', 'justification', 'source_row', 'confidence']}, "aliases": []}
    update = {f"{update_data.system}_mapping": json.dumps(mapping_obj)}
    
    if existing_row: existing_row.update(update)
    else: master_map_data.append({"suggested_icd_name": update_data.new_icd_name, **update})
    write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
    return {"status": "success"}

# FILE: admin.py
"""
@router.post("/update-master-mapping")
def update_master_mapping(payload: MasterUpdatePayload, user: Any = Depends(get_current_user)):
    # --- NEW: Backend Validation ---
    # Primary term must have a name
    if not payload.mapping.get("primary") or not payload.mapping["primary"].get("term"):
        raise HTTPException(status_code=400, detail="Primary term must have a Term Name.")
        
    # Any alias provided must have both a term and a source description
    for alias in payload.mapping.get("aliases", []):
        if not alias.get("term") or not alias.get("source_description"):
            raise HTTPException(status_code=400, detail="Invalid alias data: Term Name and Source Description are required for all aliases.")
    # --- End of Validation ---

    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    row_found = False
    for row in master_map_data:
        if row.get("suggested_icd_name") == payload.icd_name:
            row[f'{payload.system}_mapping'] = json.dumps(payload.mapping)
            row_found = True
            break
    if not row_found:
        new_row = {"suggested_icd_name": payload.icd_name}
        # Initialize other systems with empty mappings if they don't exist
        for sys in ['ayurveda', 'siddha', 'unani']:
            new_row[f'{sys}_mapping'] = ""
        new_row[f'{payload.system}_mapping'] = json.dumps(payload.mapping)
        master_map_data.append(new_row)

    write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
    return {"status": "success"}


"""
# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py

# In app/api/endpoints/admin.py

@router.post("/update-master-mapping")
def update_master_mapping(payload: MasterUpdatePayload, db: Session = Depends(get_db)):
    """
    DB-DRIVEN (REWRITTEN): A robust version that correctly handles creating,
    updating, and deleting terms and their mappings from the editor modal.
    """
    icd_code_obj = db.query(ICD11Code).filter(ICD11Code.icd_name == payload.icd_name).first()
    if not icd_code_obj:
        raise HTTPException(status_code=404, detail="ICD Code not found.")

    system = payload.system.lower()
    
    # 1. Get all incoming terms from the payload sent by the frontend editor
    incoming_terms_data = []
    if payload.mapping.get("primary") and payload.mapping["primary"].get("term"):
        primary_term_data = payload.mapping["primary"]
        primary_term_data['is_primary'] = True
        incoming_terms_data.append(primary_term_data)
    incoming_terms_data.extend(payload.mapping.get("aliases", []))

    # 2. Get all existing mappings for this ICD/system from the database to compare against
    existing_mappings = db.query(Mapping).join(TraditionalTerm).filter(
        Mapping.icd11_code_id == icd_code_obj.id,
        Mapping.status == 'staged',
        TraditionalTerm.system == system
    ).all()
    
    # Use the database ID as the most reliable unique key
    existing_mappings_by_id = {m.id: m for m in existing_mappings}
    
    # 3. Process all terms coming from the frontend
    for term_data in incoming_terms_data:
        term_obj = None
        # Try to find an existing TraditionalTerm by its code if it exists
        if term_data.get('code'):
            term_obj = db.query(TraditionalTerm).filter_by(system=system, code=term_data['code']).first()

        if term_obj:
            # UPDATE existing term: If found, update its details
            term_obj.term = term_data.get('term')
            term_obj.source_description = term_data.get('source_description')
            # Update new short/long definition fields
            term_obj.source_short_definition = term_data.get('source_short_definition')
            term_obj.source_long_definition = term_data.get('source_long_definition')
            # Sanitize source_row before updating
            source_row_str = str(term_data.get('source_row', '')).strip()
            term_obj.source_row = int(source_row_str) if source_row_str.isdigit() else None
        else:
            # CREATE new term: If no term with that code exists, create a new one
            source_row_str = str(term_data.get('source_row', '')).strip()
            term_obj = TraditionalTerm(
                system=system,
                term=term_data.get('term'),
                code=term_data.get('code'),
                source_description=term_data.get('source_description'),
                source_short_definition=term_data.get('source_short_definition'),
                source_long_definition=term_data.get('source_long_definition'),
                source_row=int(source_row_str) if source_row_str.isdigit() else None
            )
            db.add(term_obj)
            db.flush() # Flush to get the new term's ID

        # Now, find or create the MAPPING that links this term to the ICD code
        mapping_obj = db.query(Mapping).filter_by(
            icd11_code_id=icd_code_obj.id, 
            traditional_term_id=term_obj.id
        ).first()

        if not mapping_obj:
            mapping_obj = Mapping(
                icd11_code_id=icd_code_obj.id,
                traditional_term_id=term_obj.id
            )
            db.add(mapping_obj)
        
        # Ensure mapping status and primary flag are set correctly
        mapping_obj.status = 'staged'
        mapping_obj.is_primary = term_data.get('is_primary', False)
        
        # If this mapping was in our original list, remove it so we know it's been processed
        if mapping_obj.id in existing_mappings_by_id:
            del existing_mappings_by_id[mapping_obj.id]

    # 4. Any mappings left in 'existing_mappings_by_id' were deleted by the user in the editor
    for mapping_id_to_delete in existing_mappings_by_id:
        mapping_to_delete = db.query(Mapping).get(mapping_id_to_delete)
        db.delete(mapping_to_delete)

    db.commit()
    return {"status": "success", "message": "Master map updated successfully."}


@router.post("/verify-mapping-with-ai")
async def verify_mapping_with_ai(payload: AIVerifyPayload, user: Any = Depends(get_current_user)):
    try: return get_gemini_verification(payload.icd_name, payload.mapping)
    except Exception as e: raise HTTPException(status_code=500, detail=f"AI verification failed: {e}")


"""
@router.post("/revert-master-mapping")
def revert_master_mapping(payload: RevertPayload, user: Any = Depends(get_current_user)):
    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    suggestions_data = read_csv_data(AI_SUGGESTIONS_FILE)
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)

    row_to_revert = next((row for row in master_map_data if row.get("suggested_icd_name") == payload.icd_name), None)
    if not row_to_revert:
        raise HTTPException(status_code=404, detail="Mapping not found in Master Map.")

    new_suggestion_row = {'suggested_icd_name': payload.icd_name}
    for system in ['ayurveda', 'siddha', 'unani']:
        suggestions_list = []
        mapping_str = row_to_revert.get(f'{system}_mapping', '')
        if mapping_str:
            try:
                mapping_obj = json.loads(mapping_str)
                if mapping_obj.get('primary') and mapping_obj['primary'].get('term'):
                    suggestions_list.append(mapping_obj['primary'])
                if mapping_obj.get('aliases'):
                    suggestions_list.extend(mapping_obj['aliases'])
            except json.JSONDecodeError:
                pass 
        new_suggestion_row[f'{system}_suggestions'] = json.dumps(suggestions_list)

    suggestions_data = [row for row in suggestions_data if row.get('suggested_icd_name') != payload.icd_name]
    suggestions_data.append(new_suggestion_row)
    master_map_data = [row for row in master_map_data if row.get("suggested_icd_name") != payload.icd_name]
    
    # This block is added to update the status
    for item in icd_master_list:
        if item['icd_name'] == payload.icd_name:
            item['status'] = 'Pending'
            break

    write_csv_data(AI_SUGGESTIONS_FILE, suggestions_data, SUGGESTION_HEADERS)
    write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
    write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)

    return {"status": "success", "message": f"'{payload.icd_name}' reverted to New Suggestions."}
"""

# In app/api/endpoints/admin.py

@router.post("/revert-master-mapping")
def revert_master_mapping(payload: RevertPayload, db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Reverts curated mappings for this ICD code back to 'suggested'.
    Now robust: handles both 'staged' and 'verified' statuses atomically.
    """
    icd_code_obj = db.query(ICD11Code).filter(ICD11Code.icd_name == payload.icd_name).first()
    if not icd_code_obj:
        raise HTTPException(status_code=404, detail="Mapping not found in Master Map.")

    # Revert any curated mappings (staged or verified) back to suggested
    mappings_to_revert = db.query(Mapping).filter(
        Mapping.icd11_code_id == icd_code_obj.id,
        Mapping.status.in_(['staged', 'verified'])
    )

    count_to_revert = mappings_to_revert.count()
    if count_to_revert == 0:
        raise HTTPException(status_code=404, detail="No curated mappings found to revert for this ICD code.")

    mappings_to_revert.update({
        "status": "suggested",
        "is_primary": False  # Reset the primary flag
    }, synchronize_session=False)

    db.commit()

    return {"status": "success", "message": f"{count_to_revert} mapping(s) for '{payload.icd_name}' reverted to New Suggestions."}


""""
@router.get("/icd-master-list")
def get_icd_master_list(user: Any = Depends(get_current_user)):
    
   # Dynamically generates the ICD Master List by combining all known ICD codes
    #from across the application and calculating their current status.
    
    # Use a set to gather all unique ICD names automatically
    all_icd_names = set()

    # 1. Gather all unique ICD codes from all data sources
    suggestions_data = read_csv_data(AI_SUGGESTIONS_FILE)
    for item in suggestions_data:
        if item.get("suggested_icd_name"):
            all_icd_names.add(item["suggested_icd_name"])

    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    for item in master_map_data:
        if item.get("suggested_icd_name"):
            all_icd_names.add(item["suggested_icd_name"])

    # Also read the manually managed list to include any descriptions
    manual_list_data = read_csv_data(ICD_MASTER_LIST_FILE)
    descriptions = {item.get("icd_name"): item.get("description") for item in manual_list_data if item.get("icd_name")}
    for item in manual_list_data:
        if item.get("icd_name"):
            all_icd_names.add(item["icd_name"])
            
    # 2. Determine which ICDs are considered "Mapped"
    # An ICD is "Mapped" if it has at least one primary mapping in the master map file.
    mapped_icds = set()
    for row in master_map_data:
        icd_name = row.get("suggested_icd_name")
        has_primary = False
        for system in ['ayurveda', 'siddha', 'unani']:
            try:
                mapping_str = row.get(f'{system}_mapping') or '{}'
                mapping = json.loads(mapping_str)
                if mapping.get('primary') and mapping['primary'].get('term'):
                    has_primary = True
                    break 
            except json.JSONDecodeError:
                continue
        if has_primary:
            mapped_icds.add(icd_name)

    # 3. Build the final response list with calculated statuses
    final_list = []
    for icd_name in sorted(list(all_icd_names)):
        status = "Mapped" if icd_name in mapped_icds else "Orphaned"
        final_list.append({
            "icd_name": icd_name,
            "description": descriptions.get(icd_name, ""), # Get description if it exists
            "status": status
        })
        
    return final_list

"""
# In app/api/endpoints/admin.py
"""
@router.get("/icd-master-list")
def get_icd_master_list(db: Session = Depends(get_db)):
    
    #DB-DRIVEN (EFFICIENT): Fetches all ICD-11 codes and dynamically determines their
    #status ('Mapped' or 'Orphaned') using an efficient database query.

    # Create a subquery to find all ICD code IDs that have at least one 'staged' mapping.
    # These are considered 'Mapped'.
    staged_icd_ids_subquery = (
        db.query(Mapping.icd11_code_id)
        .filter(Mapping.status == 'staged')
        .distinct()
        .subquery()
    )

    # The main query fetches all ICD codes. It uses a CASE statement to check
    # if the code's ID is in our subquery of mapped IDs.
    icd_list_query = db.query(
        ICD11Code.icd_name,
        ICD11Code.description,
        case(
            (ICD11Code.id.in_(staged_icd_ids_subquery), "Mapped"),
            else_="Orphaned"
        ).label("status")
    ).order_by(ICD11Code.icd_name).all()

    # The query result is a list of Row objects that FastAPI can directly serialize
    return icd_list_query



"""

# In app/api/endpoints/admin.py

@router.get("/icd-master-list")
def get_icd_master_list(db: Session = Depends(get_db)):
    """
    DB-DRIVEN (CORRECTED): Fetches all ICD-11 codes, determines their
    status, and converts the result to a standard list of dicts for FastAPI.
    An ICD is considered "Mapped" if it has at least one mapping with
    status 'staged' OR 'verified'.
    """
    # Use scalar_subquery() to prevent SQLAlchemy warnings. Include both
    # 'staged' and 'verified' as "mapped" states.
    mapped_icd_ids_subquery = (
        db.query(Mapping.icd11_code_id)
        .filter(Mapping.status.in_(['staged', 'verified']))
        .distinct()
        .scalar_subquery()
    )

    icd_list_query_result = db.query(
        ICD11Code.icd_name,
        ICD11Code.icd_code,
        ICD11Code.description,
        case(
            (ICD11Code.id.in_(mapped_icd_ids_subquery), "Mapped"),
            else_="Orphaned"
        ).label("status")
    ).order_by(ICD11Code.icd_name).all()

    # --- THIS IS THE FIX ---
    # Manually convert the special database result into a simple list of dictionaries
    # that FastAPI can easily handle.
    results = [row._asdict() for row in icd_list_query_result]

    return results


@router.post("/enrich-icd-from-who")
def enrich_icd_from_who(payload: EnrichICDPayload, db: Session = Depends(get_db)):
    """
    Enrich a single ICD-11 entry with WHO code and definition, regardless of verification state.
    Useful when search results return code/title but the definition requires a follow-up fetch.
    """
    icd = db.query(ICD11Code).filter(ICD11Code.icd_name == payload.icd_name).first()
    if not icd:
        raise HTTPException(status_code=404, detail="ICD name not found.")

    rel = payload.release
    who_data = None

    # Prefer release-aware MMS search to get code directly
    try:
        who_data = who_api_client.mms_search_by_release(payload.icd_name, rel)
    except Exception:
        who_data = None

    # Fallback: foundation search then linearized fetch for the release
    if not who_data:
        ent_uri = who_api_client.search_foundation_uri(payload.icd_name)
        if ent_uri:
            ent_id = ent_uri.rstrip('/').split('/')[-1]
            who_data = who_api_client.fetch_linearized_entity_by_release(ent_id, 'mms', rel)

    # If we still have no result, try generic search-and-fetch
    if not who_data:
        who_data = who_api_client.search_and_fetch_entity(payload.icd_name)

    if not who_data:
        raise HTTPException(status_code=404, detail="WHO data not found for given name.")

    def _val(x):
        if isinstance(x, dict):
            return x.get("@value") or x.get("value")
        return x

    title = _val(who_data.get("title"))
    definition = _val(who_data.get("definition"))
    code = who_data.get("code") or None
    ent_id = who_data.get("@id") or who_data.get("id")

    # If definition missing, fetch full entity details
    if not definition and ent_id:
        try:
            full_ent = who_api_client.get_entity_details(ent_id)
            if full_ent:
                title = _val(full_ent.get("title")) or title
                definition = _val(full_ent.get("definition")) or definition
                code = full_ent.get("code") or code
        except Exception:
            pass

    # Persist updates
    dirty = False
    if definition and icd.description != definition:
        icd.description = definition
        dirty = True
    if code and getattr(icd, 'icd_code', None) != code:
        icd.icd_code = code
        dirty = True

    if dirty:
        db.add(icd)
        db.commit()

    return {
        "icd_name": icd.icd_name,
        "icd_code": getattr(icd, 'icd_code', None),
        "description": icd.description,
        "title": title,
    }



@router.post("/add-icd-code")
def add_icd_code(payload: ICDAddPayload, user: Any = Depends(get_current_user)):
    icd_list = read_csv_data(ICD_MASTER_LIST_FILE)
    if any(item['icd_name'].lower() == payload.icd_name.lower() for item in icd_list):
        raise HTTPException(status_code=400, detail="ICD-11 Name already exists.")
    icd_list.append({"icd_name": payload.icd_name, "description": payload.description, "status": "Orphaned"})
    write_csv_data(ICD_MASTER_LIST_FILE, icd_list, ICD_MASTER_HEADERS)
    return {"status": "success"}




# In app/api/endpoints/admin.py

@router.post("/add-icd-code")
def add_icd_code(payload: ICDAddPayload, db: Session = Depends(get_db)):
    """
    DB-DRIVEN: Adds a new ICD-11 code to the database.
    """
    # Check if a code with the same name already exists (case-insensitive)
    existing_code = db.query(ICD11Code).filter(func.lower(ICD11Code.icd_name) == func.lower(payload.icd_name)).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="ICD-11 Name already exists.")
    
    # Create the new record
    new_code = ICD11Code(
        icd_name=payload.icd_name,
        description=payload.description,
        status="Orphaned" # New codes are always orphaned by default
    )
    db.add(new_code)
    db.commit()
    
    return {"status": "success"}




@router.post("/fetch-who-description")
def fetch_who_description(payload: DescriptionFetchPayload, user: Any = Depends(get_current_user)):
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
    target_icd = next((item for item in icd_master_list if item['icd_name'] == payload.icd_name), None)
    if not target_icd: raise HTTPException(status_code=404, detail="ICD name not found in master list.")
    if target_icd.get('who_description'): return {"description": target_icd['who_description']}

    lock_file = os.path.join(LOCK_DIR, f"{payload.icd_name.replace('/', '_')}.lock")
    if os.path.exists(lock_file): return {"description": "Fetch in progress, please wait..."}
    
    try:
        open(lock_file, 'w').close()
        token = get_who_api_token()
        if not token: raise HTTPException(status_code=503, detail="Could not authenticate with WHO API.")
        headers = { 'Authorization': f'Bearer {token}', 'Accept': 'application/json', 'API-Version': 'v2' }
        search_url = f"{WHO_API_BASE_URL}?q={payload.icd_name}"
        r = requests.get(search_url, headers=headers); r.raise_for_status()
        entities = r.json().get('destinationEntities', [])
        if not entities: raise HTTPException(status_code=404, detail="ICD code not found via WHO API.")
        
        definition = entities[0].get('definition', {}).get('value', 'No definition found.')
        target_icd['who_description'] = definition
        write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)
        return {"description": definition}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"WHO API request failed: {e}")
    finally:
        if os.path.exists(lock_file): os.remove(lock_file)

@router.post("/fetch-ai-description")
def fetch_ai_description(payload: AIFetchPayload, user: Any = Depends(get_current_user)):
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    prompt = f"""
    Based on the following official ICD-11 medical term and its WHO description, provide a very concise, one-sentence summary and a confidence score from 0-100 indicating how well-defined and unambiguous this medical term is.
    Medical Term: "{payload.icd_name}"
    Official Description: "{payload.who_description}"
    Your response MUST be a valid JSON object with ONLY two keys: "ai_description" (the one-sentence summary) and "ai_confidence" (an integer).
    Example: {{"ai_description": "This term refers to a specific bacterial infection of the lungs.", "ai_confidence": 95}}
    """
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned_response)
        icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
        for item in icd_master_list:
            if item['icd_name'] == payload.icd_name:
                item['ai_description'] = result.get('ai_description'); item['ai_confidence'] = result.get('ai_confidence'); break
        write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")

@router.get("/all-traditional-terms")
def get_all_traditional_terms(user: Any = Depends(get_current_user)):
    all_terms = {}
    suggestions = read_csv_data(AI_SUGGESTIONS_FILE)
    for row in suggestions:
        for system in ['ayurveda', 'siddha', 'unani']:
            try:
                for term in json.loads(row.get(f'{system}_suggestions', '[]')):
                    key = (term.get('term'), term.get('code'))
                    if key not in all_terms: all_terms[key] = {**term, "mapped_to": row['suggested_icd_name'], "system": system}
            except: continue
    master_map = read_csv_data(CURATION_IN_PROGRESS_FILE)
    for row in master_map:
        for system in ['ayurveda', 'siddha', 'unani']:
            try:
                mapping = json.loads(row.get(f'{system}_mapping', '{}'))
                terms = [t for t in (mapping.get('primary'), *(mapping.get('aliases', []))) if t]
                for term in terms:
                    key = (term.get('term'), term.get('code'))
                    if key not in all_terms: all_terms[key] = {**term, "mapped_to": row['suggested_icd_name'], "system": system}
            except: continue
    return list(all_terms.values())

@router.post("/update-manual-mapping")
def update_manual_mapping(payload: ManualMappingPayload, user: Any = Depends(get_current_user)):
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
    for item in icd_master_list:
        if item['icd_name'] == payload.icd_name:
            item['status'] = 'Pending' if payload.destination == 'new_suggestions' else 'Mapped'; break

    if payload.destination == 'new_suggestions':
        suggestions_data = read_csv_data(AI_SUGGESTIONS_FILE)
        sugg_row = next((r for r in suggestions_data if r['suggested_icd_name'] == payload.icd_name), None)
        new_suggs = [t for t in (payload.mapping.get('primary'), *(payload.mapping.get('aliases', []))) if t]
        if sugg_row: sugg_row[f'{payload.system}_suggestions'] = json.dumps(new_suggs)
        else: suggestions_data.append({'suggested_icd_name': payload.icd_name, f'{payload.system}_suggestions': json.dumps(new_suggs)})
        write_csv_data(AI_SUGGESTIONS_FILE, suggestions_data, SUGGESTION_HEADERS)
    else:
        master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
        master_row = next((r for r in master_map_data if r['suggested_icd_name'] == payload.icd_name), None)
        if master_row: master_row[f'{payload.system}_mapping'] = json.dumps(payload.mapping)
        else: master_map_data.append({'suggested_icd_name': payload.icd_name, f'{payload.system}_mapping': json.dumps(payload.mapping)})
        write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)

    write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)
    return {"status": "success"}

@router.post("/send-for-re-curation")
def send_for_re_curation(payload: ReCurationPayload, user: Any = Depends(get_current_user)):
    correction_queue = read_csv_data(REJECTED_MAPPINGS_FILE)
    term_data, orig_icd, system = payload.term_data, payload.original_icd_name, payload.system
    remaining = [i for i in correction_queue if not (i.get("original_icd_name") == orig_icd and i.get("system") == system and i.get("term") == term_data.get("term"))]
    write_csv_data(REJECTED_MAPPINGS_FILE, remaining, REJECTED_HEADERS)
    
    suggestions_data = read_csv_data(AI_SUGGESTIONS_FILE)
    sugg_row = next((r for r in suggestions_data if r['suggested_icd_name'] == payload.new_icd_name), None)
    if sugg_row:
        suggs = json.loads(sugg_row.get(f'{system}_suggestions', '[]')); suggs.append(term_data)
        sugg_row[f'{system}_suggestions'] = json.dumps(suggs)
    else:
        suggestions_data.append({"suggested_icd_name": payload.new_icd_name, f'{system}_suggestions': json.dumps([term_data])})
    write_csv_data(AI_SUGGESTIONS_FILE, suggestions_data, SUGGESTION_HEADERS)
    return {"status": "success"}

@router.post("/remap-traditional-term")
def remap_traditional_term(payload: RemapTermPayload, user: Any = Depends(get_current_user)):
    master_map_data = read_csv_data(CURATION_IN_PROGRESS_FILE)
    icd_master_list = read_csv_data(ICD_MASTER_LIST_FILE)
    term, old_icd, new_icd, system = payload.term_data, payload.old_icd_name, payload.new_icd_name, payload.target_system

    old_row = next((r for r in master_map_data if r.get("suggested_icd_name") == old_icd), None)
    if old_row:
        try:
            mapping = json.loads(old_row.get(f'{system}_mapping', '{}'))
            if mapping.get('primary') and mapping['primary'].get('code') == term.get('code'): mapping['primary'] = None
            if mapping.get('aliases'): mapping['aliases'] = [a for a in mapping['aliases'] if a.get('code') != term.get('code')]
            old_row[f'{system}_mapping'] = json.dumps(mapping)
        except: pass

    new_row = next((r for r in master_map_data if r.get("suggested_icd_name") == new_icd), None)
    if new_row:
        try:
            new_mapping = json.loads(new_row.get(f'{system}_mapping', '{}'))
            if not new_mapping.get('primary'): new_mapping['primary'] = term
            else: new_mapping.setdefault('aliases', []).append(term)
            new_row[f'{system}_mapping'] = json.dumps(new_mapping)
        except: new_row[f'{system}_mapping'] = json.dumps({'primary': term, 'aliases': []})
    else:
        master_map_data.append({"suggested_icd_name": new_icd, f'{system}_mapping': json.dumps({'primary': term, 'aliases': []})})

    if old_row:
        is_now_orphaned = all(not json.loads(old_row.get(f'{s}_mapping', '{}')).get('primary') and not json.loads(old_row.get(f'{s}_mapping', '{}')).get('aliases') for s in ['ayurveda', 'siddha', 'unani'])
        if is_now_orphaned:
            for item in icd_master_list:
                if item['icd_name'] == old_icd: item['status'] = 'Orphaned'; break
    
    write_csv_data(CURATION_IN_PROGRESS_FILE, master_map_data, CURATION_HEADERS)
    write_csv_data(ICD_MASTER_LIST_FILE, icd_master_list, ICD_MASTER_HEADERS)
    return {"status": "success"}


@router.get("/debug-mappings")
def debug_mappings(db: Session = Depends(get_db)):
    """
    TEMPORARY ENDPOINT to diagnose data integrity issues in the mappings table.
    """
    print("\n--- RUNNING ADVANCED MAPPING DEBUGGER ---")

    # Query 1: The original "strict" query that is failing.
    strict_count = db.query(Mapping).filter(
        Mapping.status.in_(['staged', 'verified'])
    ).count()
    print(f"1. Strict Query Count (status IN ('staged', 'verified')): {strict_count}")

    # Query 2: A "loose" query that trims whitespace and is case-insensitive.
    # This will find rows with statuses like ' verified ' or 'Verified'.
    loose_count = db.query(Mapping).filter(
        func.trim(func.lower(Mapping.status)).in_(['staged', 'verified'])
    ).count()
    print(f"2. Loose Query Count (TRIM and LOWER): {loose_count}")

    # Query 3: Get all distinct statuses present in the table.
    # This will show us exactly what is stored in the database.
    all_statuses_query = db.query(Mapping.status).distinct().all()
    all_statuses = [status for (status,) in all_statuses_query]
    print(f"3. All Distinct Statuses Found in DB: {all_statuses}")

    return {
        "strict_query_found": strict_count,
        "loose_query_found_whitespace_or_case_issue": loose_count,
        "all_distinct_statuses_in_table": all_statuses
    }