import os
from datetime import timedelta

# Provide minimal required env vars for settings; remove any extraneous ones that
# cause pydantic Settings(extra='forbid') validation errors (e.g., DEV_MODE).
os.environ.pop('DEV_MODE', None)
os.environ.setdefault('DATABASE_URL', 'sqlite:///./test_unified.db')
os.environ.setdefault('SECRET_KEY', 'test_secret_key_metrics')
os.environ.setdefault('GEMINI_API_KEY', 'dummy')
os.environ.setdefault('WHO_API_CLIENT_ID', 'dummy')
os.environ.setdefault('WHO_API_CLIENT_SECRET', 'dummy')
os.environ.setdefault('WHO_TOKEN_URL', 'https://example.org/token')
os.environ.setdefault('WHO_API_BASE_URL', 'https://example.org/api')

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.models import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)
client = TestClient(app)

def auth_headers():
    token = create_access_token({'sub':'metrics_tester'}, expires_delta=timedelta(hours=1))
    return {'Authorization': f'Bearer {token}'}

def test_suggestions_metrics_smoke():
    # Just call metrics; should not error even if empty
    r = client.get('/api/admin/suggestions/metrics', headers=auth_headers())
    assert r.status_code == 200, r.text
    js = r.json()
    assert 'total_icds' in js and 'per_system' in js
    assert set(js['per_system'].keys()) == {'ayurveda','siddha','unani'}