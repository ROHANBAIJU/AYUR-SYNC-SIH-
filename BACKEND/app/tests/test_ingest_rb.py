import os, io
from datetime import timedelta

os.environ['DATABASE_URL'] = 'sqlite:///./test_unified.db'
os.environ.setdefault('SECRET_KEY', 'a_very_secret_key_for_development_change_me')
# Required external integration envs (dummy for tests)
os.environ.setdefault('GEMINI_API_KEY','dummy')
os.environ.setdefault('WHO_API_CLIENT_ID','dummy')
os.environ.setdefault('WHO_API_CLIENT_SECRET','dummy')
os.environ.setdefault('WHO_TOKEN_URL','https://example.org/token')
os.environ.setdefault('WHO_API_BASE_URL','https://example.org/api')

from fastapi.testclient import TestClient
from app.core.security import create_access_token
from app.main import app
from app.db.models import Base, Mapping, IngestionRow
from app.db.session import engine

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def auth_headers():
    token = create_access_token({'sub':'rb_tester'}, expires_delta=timedelta(hours=1))
    return {'Authorization': f'Bearer {token}'}

CSV_HEADER = 'system,code,term,suggested_icd_name,short_definition,long_definition,vernacular_term\n'
CSV_ROW = 'ayurveda,AY-100,RB disorder,,Functional imbalance of Kapha dosha,,"Shleshma vriddhi causing congestion"\n'

def test_single_rb_disorder_ingest_and_promote():
    # Upload one-row CSV (suggested_icd_name intentionally blank to trigger fallback / AI path)
    csv_bytes = (CSV_HEADER + CSV_ROW).encode('utf-8')
    files = {'file': ('stest_rb.csv', csv_bytes, 'text/csv')}
    r = client.post('/api/admin/ingest/upload', files=files, headers=auth_headers())
    assert r.status_code == 200, r.text
    js = r.json(); batch_id = js['batch_id']
    assert js['rows'] == 1

    # Fetch rows for batch
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows', headers=auth_headers())
    assert r.status_code == 200
    rows = r.json()['rows']
    assert len(rows) == 1
    row = rows[0]
    assert row['status'] == 'pending'
    assert row['suggested_icd_name'] in (None, '', 'RB disorder', 'Rb Disorder')  # before promotion

    # Promote row
    promote = client.post(f"/api/admin/ingest/rows/{row['id']}/promote", headers=auth_headers())
    assert promote.status_code == 200, promote.text
    pr = promote.json()
    assert pr['row_id'] == row['id']
    assert pr['primary'] is True  # first mapping for (icd/system) should auto-primary
    assert pr['icd_name']  # non-empty fallback/AI name

    # Re-fetch rows: status should be promoted
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows', headers=auth_headers())
    assert r.status_code == 200
    row2 = r.json()['rows'][0]
    assert row2['status'] == 'promoted'

    # Ensure a Mapping exists that references this term
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        # Check mapping count increases
        m_count = db.query(Mapping).count()
        assert m_count >= 1
        ir = db.query(IngestionRow).get(row['id'])
        assert ir.status == 'promoted'
    finally:
        db.close()

    # Idempotent promote
    again = client.post(f"/api/admin/ingest/rows/{row['id']}/promote", headers=auth_headers())
    assert again.status_code == 200
    assert 'already' in again.text.lower()
