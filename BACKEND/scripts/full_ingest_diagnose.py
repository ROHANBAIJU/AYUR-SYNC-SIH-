"""End-to-end automated test & diagnostics for ingestion delete + CORS/auth differentiation.

Performs:
  1. Login (POST /api/auth/token) using ADMIN_USER / ADMIN_PASS env (defaults admin / sih2024)
  2. Upload minimal ingestion CSV (system,term)
  3. Verify batch appears in list
  4. Delete batch and confirm removal
  5. Preflight OPTIONS request to upload endpoint
  6. Authenticated upload (sanity) & unauthenticated upload for contrast
  7. Summarize interpretation (auth vs true CORS)

Exit codes:
  0 success, non-zero for failures.
"""
from __future__ import annotations
import os, io, csv, time, sys, json
import requests

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
USER = os.environ.get("ADMIN_USER", "admin")
PASS = os.environ.get("ADMIN_PASS", "sih2024")
ORIGIN = os.environ.get("TEST_ORIGIN", "http://127.0.0.1:5500")
UPLOAD_URL = f"{API_BASE}/admin/ingest/upload"

print(f"[STEP] Login as {USER} @ {API_BASE}")
login_resp = requests.post(f"{API_BASE}/auth/token", data={"username": USER, "password": PASS})
print("[INFO] Login status", login_resp.status_code)
if login_resp.status_code != 200:
    print("[ERROR] Login failed body:", login_resp.text[:400])
    sys.exit(2)
TOKEN = login_resp.json().get("access_token")
if not TOKEN:
    print("[ERROR] No access_token in response")
    sys.exit(3)
print("[OK] Got token length", len(TOKEN))
HEAD = {"Authorization": f"Bearer {TOKEN}"}

# Build minimal CSV
buf = io.StringIO(); w = csv.writer(buf); w.writerow(["system","term"]); w.writerow(["ayurveda", f"diag-term-{int(time.time())}"])
files = {"file": ("diag_batch.csv", buf.getvalue().encode("utf-8"), "text/csv")}
print("[STEP] Upload test batch")
up = requests.post(UPLOAD_URL, headers=HEAD, files=files)
print("[INFO] Upload status", up.status_code)
if up.status_code != 200:
    print("[ERROR] Upload failed body:", up.text[:400])
    sys.exit(4)
up_json = up.json(); batch_id = up_json.get("batch_id")
print("[OK] Created batch", batch_id)

print("[STEP] List batches and confirm presence")
ls = requests.get(f"{API_BASE}/admin/ingest/batches", headers=HEAD)
print("[INFO] List status", ls.status_code, "count", len(ls.json().get("batches", [])))
if ls.status_code != 200 or not any(b.get("id") == batch_id for b in ls.json().get("batches", [])):
    print("[ERROR] New batch not found in list")
    sys.exit(5)

print("[STEP] Delete batch")
rm = requests.delete(f"{API_BASE}/admin/ingest/batches/{batch_id}", headers=HEAD)
print("[INFO] Delete status", rm.status_code)
if rm.status_code != 200:
    print("[ERROR] Delete failed body:", rm.text[:400])
    sys.exit(6)

print("[STEP] Confirm deletion")
ls2 = requests.get(f"{API_BASE}/admin/ingest/batches", headers=HEAD)
if any(b.get("id") == batch_id for b in ls2.json().get("batches", [])):
    print("[ERROR] Batch still present after delete")
    sys.exit(7)
print("[OK] Deletion confirmed")

print("[STEP] CORS preflight simulation OPTIONS")
pre_headers = {
    'Origin': ORIGIN,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
}
pre = requests.options(UPLOAD_URL, headers=pre_headers)
print("[INFO] Preflight status", pre.status_code)
acao = pre.headers.get('Access-Control-Allow-Origin')
print("[INFO] ACAO header:", acao)

print("[STEP] Authenticated upload (sanity after delete)")
buf2 = io.StringIO(); w2 = csv.writer(buf2); w2.writerow(['system','term']); w2.writerow(['ayurveda', 'sanity-term'])
files2 = { 'file': ('sanity.csv', buf2.getvalue().encode('utf-8'), 'text/csv') }
up2 = requests.post(UPLOAD_URL, headers={**HEAD, 'Origin': ORIGIN}, files=files2)
print("[INFO] Auth upload status", up2.status_code)

print("[STEP] Unauthenticated upload for contrast")
up3 = requests.post(UPLOAD_URL, headers={'Origin': ORIGIN}, files=files2)
print("[INFO] Unauth upload status", up3.status_code)
print("[INFO] Unauth body first 120 chars:", up3.text[:120])

print("[SUMMARY]")
if pre.status_code in (200,204) and acao:
    print(" - Preflight succeeded (CORS middleware functioning)")
else:
    print(" - Preflight failed or missing ACAO (possible CORS misconfig)")
if up2.status_code == 200:
    print(" - Authenticated upload succeeded → endpoint healthy")
else:
    print(f" - Auth upload failed HTTP {up2.status_code}")
if up3.status_code in (401,403):
    print(" - Unauth upload returns auth error (expected); browser 'CORS' errors likely auth-related if this pattern seen.")
else:
    print(f" - Unauth upload returned {up3.status_code} (unexpected; might indicate alternative issue)")

print("[RESULT] All core steps completed.")
