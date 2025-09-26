import requests, json, sys, os

BASE = os.environ.get('API_BASE', 'http://127.0.0.1:8000')
ICD_NAME = os.environ.get('TEST_ICD_NAME', 'ABDOMINAL DISTENSION')
RELEASE = os.environ.get('CM_RELEASE', 'v1-submission')
USERNAME = os.environ.get('API_USER', 'admin')
PASSWORD = os.environ.get('API_PASS', 'sih2024')

print(f"[INFO] Testing FHIR / ConceptMap flow for ICD_NAME='{ICD_NAME}' against {BASE}")

def _pretty(title, obj):
    print(f"\n=== {title} ===")
    if isinstance(obj, (dict, list)):
        print(json.dumps(obj, indent=2)[:2000])
    else:
        print(str(obj)[:2000])

try:
    tok_resp = requests.post(f"{BASE}/api/auth/token", data={'username': USERNAME, 'password': PASSWORD}, timeout=30)
    tok_resp.raise_for_status()
    token = tok_resp.json().get('access_token')
except Exception as e:
    print('[ERROR] Failed to obtain token:', e, getattr(tok_resp, 'text', ''))
    sys.exit(1)

H = {'Authorization': f'Bearer {token}'}

# 1. Translate by icd_name (pre-refresh to fetch verified mapping details)
translate_data = requests.get(f"{BASE}/api/public/translate", params={'icd_name': ICD_NAME}, headers=H, timeout=60).json()
_pre_result = translate_data
_pre_outcome = translate_data.get('resourceType') == 'OperationOutcome'
_pre_params = translate_data.get('resourceType') == 'Parameters'
_pre_fhir_wrap = _pre_params or _pre_outcome
_pre_note = 'FHIR-wrapped' if _pre_fhir_wrap else 'Raw JSON'
_pretty('Public Translate (icd_name) BEFORE refresh', {'note': _pre_note, 'data': translate_data})

# Extract a system+code for FHIR $translate
sel_system = None
sel_code = None
for sys_name in ['ayurveda','siddha','unani']:
    entry = translate_data.get(sys_name)
    if isinstance(entry, dict):
        primary = entry.get('primary')
        if primary and (primary.get('code') or primary.get('name')):
            sel_system = sys_name
            sel_code = primary.get('code') or primary.get('name')
            break

if not sel_system:
    print('[WARN] Could not find a primary verified mapping in translate response; $translate may fail.')
else:
    print(f"[INFO] Selected system/code for FHIR $translate: {sel_system} / {sel_code}")

# 2. Refresh ConceptMap release snapshot
refresh_resp = requests.post(f"{BASE}/api/admin/conceptmap/releases/{RELEASE}/refresh", headers=H, timeout=120)
try:
    refresh_json = refresh_resp.json()
except Exception:
    refresh_json = {'status_code': refresh_resp.status_code, 'text': refresh_resp.text[:400]}
_pretty('ConceptMap Refresh', refresh_json)

# 3. Fetch elements for that ICD in the release
cm_elements = requests.get(f"{BASE}/api/admin/conceptmap/releases/{RELEASE}/elements", params={'icd_name': ICD_NAME}, headers=H, timeout=60).json()
_pretty('ConceptMap Elements (filtered by ICD)', cm_elements)

# 4. FHIR ConceptMap $translate (only if we have a code)
if sel_system and sel_code:
    cm_translate = requests.get(f"{BASE}/api/fhir/ConceptMap/$translate", params={'system': sel_system, 'code': sel_code}, headers=H, timeout=60).json()
    _pretty('FHIR ConceptMap $translate', cm_translate)
else:
    print('[SKIP] FHIR ConceptMap $translate skipped (no selected system/code).')

# 5. ValueSet $expand for that system (if available)
if sel_system:
    vs_expand = requests.get(f"{BASE}/api/fhir/ValueSet/$expand", params={'system': sel_system, 'count': 5}, headers=H, timeout=60).json()
    _pretty('FHIR ValueSet $expand', vs_expand)
else:
    print('[SKIP] ValueSet $expand skipped (no system).')

# 6. Provenance for ConceptMap element
prov_params = {'icd_name': ICD_NAME}
if sel_system:
    prov_params['system'] = sel_system
prov = requests.get(f"{BASE}/api/fhir/provenance/conceptmap", params=prov_params, headers=H, timeout=60).json()
_pretty('FHIR Provenance (ConceptMap)', prov)

# 7. Public forward translate (system+code)
if sel_system and sel_code:
    forward = requests.get(f"{BASE}/api/public/translate", params={'system': sel_system, 'code': sel_code, 'target': 'icd11', 'fhir': 'true'}, headers=H, timeout=60).json()
    _pretty('Public Translate (system+code, fhir=true)', forward)
else:
    print('[SKIP] Public forward translate skipped (no system/code).')

print('\n[INFO] Test sequence complete.')
