import os, datetime
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'  # isolated in-memory
os.environ.setdefault('SECRET_KEY', 'a_very_secret_key_for_development_change_me')

from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app  # imports settings & creates tables
from app.db.models import Base, ICD11Code, TraditionalTerm, Mapping
from app.db.session import get_db

# Prepare a clean DB (sqlite file) for the test suite
engine = create_engine(os.environ['DATABASE_URL'], connect_args={'check_same_thread': False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
app.dependency_overrides[get_db] = override_get_db

def seed():
    db = TestingSessionLocal()
    icd = ICD11Code(icd_name='Abdominal distension', status='verified')
    db.add(icd); db.flush()
    term = TraditionalTerm(system='ayurveda', term='AdhmAnam', code='SM31(AAC-12)')
    db.add(term); db.flush()
    m = Mapping(icd11_code_id=icd.id, traditional_term_id=term.id, status='verified', is_primary=True)
    db.add(m)
    db.commit(); db.close()

seed()
client = TestClient(app)

def auth_headers():
    token = jwt.encode({'sub':'tester','exp': int((datetime.datetime.utcnow()+datetime.timedelta(hours=1)).timestamp())}, os.environ['SECRET_KEY'], algorithm='HS256')
    return {'Authorization': f'Bearer {token}'}

def test_capability_statement():
    r = client.get('/api/fhir/metadata', headers=auth_headers())
    assert r.status_code == 200
    assert r.json().get('resourceType') == 'CapabilityStatement'

def test_valueset_expand():
    r = client.get('/api/fhir/ValueSet/$expand', params={'system':'ayurveda','count':5}, headers=auth_headers())
    assert r.status_code == 200
    js = r.json()
    assert js['resourceType']=='ValueSet'
    assert 'expansion' in js

def test_conceptmap_translate_alias():
    # Use alias path (without $) for reliability
    r = client.get('/api/fhir/ConceptMap/translate', params={'system':'ayurveda','code':'SM31(AAC-12)'}, headers=auth_headers())
    assert r.status_code == 200
    js = r.json()
    assert js['resourceType']=='Parameters'
    names = [p['name'] for p in js['parameter']]
    assert 'match' in names
