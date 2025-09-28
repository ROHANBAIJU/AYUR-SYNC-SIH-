"""Diagnose apparent CORS vs auth vs network issues for the ingestion upload endpoint.

Run:
  set API_BASE=http://127.0.0.1:8000/api
  set TOKEN=... (PowerShell: $env:API_BASE="http://127.0.0.1:8000/api"; $env:TOKEN="<token>")
  python scripts/diagnose_cors.py

It performs:
  1. Preflight simulation (OPTIONS) with typical headers
  2. Authenticated upload (if TOKEN provided) with minimal CSV
  3. Unauthenticated upload (expect 401/403) for contrast
  4. Prints interpretation hints
"""
from __future__ import annotations
import os, io, csv, time, requests, json, sys

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
TOKEN = os.environ.get("TOKEN")
UPLOAD_URL = f"{API_BASE}/admin/ingest/upload"

print("[DIAG] Using", UPLOAD_URL)

# 1. Simulated preflight (server may not define explicit handler; CORS middleware should answer)
pre_headers = {
    'Origin': 'http://127.0.0.1:5500',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
}
pre = requests.options(UPLOAD_URL, headers=pre_headers)
print('[DIAG] Preflight status:', pre.status_code)
for k,v in pre.headers.items():
    if k.lower().startswith('access-control-'):
        print('  ', k+':', v)

# Prepare small CSV
buf = io.StringIO()
writer = csv.writer(buf)
writer.writerow(['system','term'])
writer.writerow(['ayurveda', f'diag-term-{int(time.time())}'])
files = { 'file': ('diag.csv', buf.getvalue().encode('utf-8'), 'text/csv') }

if TOKEN:
    auth_headers={'Authorization': f'Bearer {TOKEN}'}
    auth_headers_with_origin={**auth_headers, 'Origin':'http://127.0.0.1:5500'}
    r_auth = requests.post(UPLOAD_URL, headers=auth_headers_with_origin, files=files)
    print('[DIAG] Auth upload status:', r_auth.status_code)
    try:
        print('[DIAG] Auth upload body:', r_auth.text[:400])
    except Exception:
        pass
else:
    print('[DIAG] Skipping auth upload (no TOKEN env)')

# Unauth upload
unauth_headers={'Origin':'http://127.0.0.1:5500'}
r_unauth = requests.post(UPLOAD_URL, headers=unauth_headers, files=files)
print('[DIAG] Unauth upload status:', r_unauth.status_code)
print('[DIAG] Unauth upload first 200 chars:', r_unauth.text[:200])

# Interpretation hints
print('\n[INTERPRET] If preflight status is 200/204 and shows Access-Control-Allow-Origin with your origin, CORS middleware works.')
print('[INTERPRET] If browser shows CORS error but this script gets 401/403 for unauth, actual issue is missing/expired token (auth).')
print('[INTERPRET] If preflight fails (>=400) or lacks ACAO header, origin not whitelisted or server down.')
print('[INTERPRET] If network error only in browser (not here), check mixed content (HTTPS vs HTTP) or ad-block extensions.')
