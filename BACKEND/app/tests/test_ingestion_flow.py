import os, datetime, io, csv
os.environ['DATABASE_URL'] = 'sqlite:///./test_unified.db'  # file-based so multiple connections share schema
os.environ.setdefault('SECRET_KEY', 'a_very_secret_key_for_development_change_me')

from fastapi.testclient import TestClient
from app.core.security import create_access_token
from datetime import timedelta

from app.main import app  # after env vars; uses single engine
from app.db.models import Base, Mapping
from app.db.session import engine

# Ensure tables (idempotent)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def auth_headers():
    token = create_access_token({'sub':'tester'}, expires_delta=timedelta(hours=1))
    return {'Authorization': f'Bearer {token}'}

def make_csv(rows):
    out = io.StringIO(); fieldnames = ['system','code','term','suggested_icd_name','confidence','justification']
    w = csv.DictWriter(out, fieldnames=fieldnames); w.writeheader();
    for r in rows: w.writerow(r)
    return out.getvalue().encode('utf-8')

sample_rows = [
    {'system':'ayurveda','code':'AY-1','term':'Sample Term A','suggested_icd_name':'Abdominal distension','confidence':'85','justification':'match'},
    {'system':'ayurveda','code':'AY-2','term':'Sample Term B','suggested_icd_name':'Abdominal distension','confidence':'40','justification':'low'},
    {'system':'siddha','code':'SD-1','term':'Siddha Term C','suggested_icd_name':'Headache','confidence':'72','justification':'semantic'},
]

def test_full_ingestion_flow():
    # Unified engine already has tables; re-run create_all for safety (no-op)
    Base.metadata.create_all(bind=engine)
    # Upload
    data = {'file': ('sample.csv', make_csv(sample_rows), 'text/csv')}
    r = client.post('/api/admin/ingest/upload', files=data, headers=auth_headers())
    assert r.status_code == 200, r.text
    batch_id = r.json()['batch_id']

    # List batches
    r = client.get('/api/admin/ingest/batches', headers=auth_headers())
    assert r.status_code == 200
    assert any(b['id']==batch_id for b in r.json()['batches'])

    # Fetch rows (no filters)
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows', headers=auth_headers())
    assert r.status_code == 200
    rows = r.json()['rows']; assert len(rows)==3

    # Filter by system
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows?system=ayurveda', headers=auth_headers())
    assert r.status_code == 200
    assert all(row['system']=='ayurveda' for row in r.json()['rows'])

    # Bulk promote first two
    first_two = [rows[0]['id'], rows[1]['id']]
    r = client.post('/api/admin/ingest/rows/bulk_promote', json={'row_ids': first_two}, headers=auth_headers())
    assert r.status_code == 200, r.text
    pr = r.json(); assert len(pr['promoted'])==2

    # Single reject third
    third_id = rows[2]['id']
    r = client.post(f'/api/admin/ingest/rows/{third_id}/reject', headers=auth_headers())
    assert r.status_code == 200

    # Status metrics reflect counts
    r = client.get('/api/status', headers=auth_headers())
    js = r.json()
    assert js['ingest_rows_promoted'] >= 2
    assert js['ingest_rows_rejected'] >= 1

    # Promote already promoted no-op
    r = client.post(f"/api/admin/ingest/rows/{rows[0]['id']}/promote", headers=auth_headers())
    assert r.status_code == 200

    # Verify promoted mapping via existing endpoint (use code)
    # Need mapping created; ensure at least one Mapping exists
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal(); total_m = db.query(Mapping).count(); db.close()
    assert total_m >= 2

    # Fast verify for one row's term
    r = client.post('/api/admin/verify', json={'icd_name':'Abdominal distension','system':'ayurveda','code':'AY-1'}, headers=auth_headers())
    assert r.status_code == 200

    # Rebuild snapshot (should succeed)
    r = client.post('/api/admin/conceptmap/releases/v1-submission/refresh', headers=auth_headers())
    assert r.status_code in (200,204)

    # Diff endpoint (no from_version -> auto previous) should work even if only one release
    r = client.get('/api/admin/conceptmap/releases/v1-submission/diff', headers=auth_headers())
    assert r.status_code == 200

    # Filters with min_conf
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows?min_conf=70', headers=auth_headers())
    assert r.status_code == 200
    assert all((row['ai_confidence'] or 0) >= 70 for row in r.json()['rows'])


def test_xls_enrichment_flow(tmp_path):
    """Upload an Excel file with some rows missing suggested_icd_name and ensure enrichment stub fills them."""
    Base.metadata.create_all(bind=engine)
    try:
        import pandas as pd
    except Exception:
        # Skip if pandas not installed (Excel path not available)
        import pytest; pytest.skip("pandas not installed")
    rows = [
        {"system": "ayurveda", "code": "AY-10", "term": "Kapha Disorder", "suggested_icd_name": "", "confidence": "", "justification": ""},
        {"system": "siddha", "code": "SD-10", "term": "Vatha Issue", "suggested_icd_name": "Existing ICD", "confidence": 77, "justification": "given"},
    ]
    df = pd.DataFrame(rows)
    xls_path = tmp_path / "sample.xlsx"
    df.to_excel(xls_path, index=False)
    with open(xls_path, 'rb') as f:
        data = {'file': ("sample.xlsx", f.read(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    r = client.post('/api/admin/ingest/upload', files=data, headers=auth_headers())
    assert r.status_code == 200, r.text
    js = r.json()
    assert js['enriched_rows'] >= 1
    batch_id = js['batch_id']
    r = client.get(f'/api/admin/ingest/batches/{batch_id}/rows', headers=auth_headers())
    assert r.status_code == 200
    rows_ret = r.json()['rows']
    # The first row should now have a suggested_icd_name via enrichment (title-cased term)
    enriched = [r for r in rows_ret if r['system']=='ayurveda'][0]
    assert enriched['suggested_icd_name'] == 'Kapha Disorder'
    # Promote enriched row
    r = client.post(f"/api/admin/ingest/rows/{enriched['id']}/promote", headers=auth_headers())
    assert r.status_code == 200
    # Verify mapping using verify endpoint (code provided)
    r = client.post('/api/admin/verify', json={'icd_name':'Kapha Disorder','system':'ayurveda','code':'AY-10'}, headers=auth_headers())
    assert r.status_code == 200
