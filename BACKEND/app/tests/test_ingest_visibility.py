import os, io, json, uuid
from datetime import timedelta

# Ensure test database & required env vars (reuse same sqlite file as other tests)
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test_unified.db')
os.environ.setdefault('SECRET_KEY', 'a_very_secret_key_for_development_change_me')
os.environ.setdefault('GEMINI_API_KEY','dummy')
os.environ.setdefault('WHO_API_CLIENT_ID','dummy')
os.environ.setdefault('WHO_API_CLIENT_SECRET','dummy')
os.environ.setdefault('WHO_TOKEN_URL','https://example.org/token')
os.environ.setdefault('WHO_API_BASE_URL','https://example.org/api')

from fastapi.testclient import TestClient
from app.core.security import create_access_token
from app.main import app
from app.db.models import Base
from app.db.session import engine
from sqlalchemy import text

# Ensure ingestion staging tables have latest columns (SQLite create_all doesn't auto-add missing columns)
with engine.connect() as conn:
    try:
        # Ingestion staging schema check
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(ingestion_rows)"))]
        required_ing_cols = {"short_definition","long_definition","vernacular_term","inference_status"}
        if not required_ing_cols.issubset(set(cols)):
            conn.execute(text("DROP TABLE IF EXISTS ingestion_rows"))
            conn.execute(text("DROP TABLE IF EXISTS ingestion_batches"))
            conn.commit()
        # Mapping table schema check (ensure origin/ingestion_filename columns exist)
        map_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(mappings)"))]
        required_map_cols = {"origin","ingestion_filename"}
        if not required_map_cols.issubset(set(map_cols)):
            conn.execute(text("DROP TABLE IF EXISTS mappings"))
            # drop traditional_terms as well to avoid orphan references if schema drifted
            conn.execute(text("DROP TABLE IF EXISTS traditional_terms"))
            conn.execute(text("DROP TABLE IF EXISTS mapping_audit"))
            conn.commit()
    except Exception:
        pass

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def auth_headers():
    token = create_access_token({'sub':'visibility_tester'}, expires_delta=timedelta(hours=1))
    return {'Authorization': f'Bearer {token}'}


def test_ingested_mapping_visible_in_all_suggestions():
    """End-to-end: ingest a CSV row with an explicit suggested_icd_name, promote it, then
    confirm it shows up in /api/admin/all-suggestions with origin=ingestion and correct filename.
    This mirrors what the New Suggestions UI loads & then the user can search for.
    """
    unique_suffix = uuid.uuid4().hex[:8]
    suggested_icd_name = f"Visibility Test ICD {unique_suffix}"  # ensures uniqueness across runs
    term = f"Test Visibility Term {unique_suffix}"

    csv_header = 'system,code,term,suggested_icd_name,short_definition,long_definition,vernacular_term\n'
    csv_row = f"ayurveda,AY-VIS,{term},{suggested_icd_name},Short def for visibility,,Vernacular Example\n"
    csv_bytes = (csv_header + csv_row).encode('utf-8')

    files = {'file': (f'visibility_{unique_suffix}.csv', csv_bytes, 'text/csv')}
    r = client.post('/api/admin/ingest/upload', files=files, headers=auth_headers())
    assert r.status_code == 200, r.text
    up = r.json()
    batch_id = up['batch_id']
    assert up['rows'] == 1

    # Fetch batches to retrieve filename (upload response does not include filename key)
    batches_resp = client.get('/api/admin/ingest/batches', headers=auth_headers())
    assert batches_resp.status_code == 200
    batches = batches_resp.json()['batches']
    batch_entry = next((b for b in batches if b['id'] == batch_id), None)
    assert batch_entry, 'Uploaded batch not found in batch listing'
    filename = batch_entry['filename']

    # Fetch the ingestion row
    rows_resp = client.get(f'/api/admin/ingest/batches/{batch_id}/rows', headers=auth_headers())
    assert rows_resp.status_code == 200
    rows = rows_resp.json()['rows']
    assert len(rows) == 1
    row = rows[0]
    assert row['suggested_icd_name'] == suggested_icd_name  # we provided explicit name
    assert row['status'] == 'pending'

    # Promote row
    promote_resp = client.post(f"/api/admin/ingest/rows/{row['id']}/promote", headers=auth_headers())
    assert promote_resp.status_code == 200, promote_resp.text
    promoted = promote_resp.json()
    assert promoted['icd_name'] == suggested_icd_name
    assert promoted['primary'] is True  # first mapping for this icd/system

    # Fetch /all-suggestions (UI uses this). The promoted mapping should now be represented.
    sugg_resp = client.get('/api/admin/all-suggestions', headers=auth_headers())
    assert sugg_resp.status_code == 200, sugg_resp.text
    suggestions = sugg_resp.json()
    assert isinstance(suggestions, list)

    # Find our ICD block
    block = next((s for s in suggestions if s['suggested_icd_name'] == suggested_icd_name), None)
    assert block, 'Newly promoted ICD suggestion block not found in all-suggestions output.'

    # Parse ayurveda suggestions JSON string
    ayu_raw = block['ayurveda_suggestions']
    assert isinstance(ayu_raw, str)
    ayu_list = json.loads(ayu_raw)
    assert isinstance(ayu_list, list) and len(ayu_list) >= 1
    ingested_obj = next((o for o in ayu_list if o.get('term') == term), None)
    assert ingested_obj, 'Ingested term object not found inside ayurveda_suggestions array.'

    # Provenance checks
    assert ingested_obj.get('origin') == 'ingestion'
    # ingestion_filename may be None if batch missing, but we expect it present & equals uploaded filename
    assert ingested_obj.get('ingestion_filename') == filename

    # This mimics the front-end search: ensure the term or ICD name would match a simple lowercase search.
    search_token = term.split()[0].lower()  # first word
    searchable_blob = (block['suggested_icd_name'] + ayu_raw).lower()
    assert search_token in searchable_blob

    # Re-promote (idempotent path) should return already promoted detail
    again = client.post(f"/api/admin/ingest/rows/{row['id']}/promote", headers=auth_headers())
    assert again.status_code == 200
    assert 'already' in again.text.lower()
