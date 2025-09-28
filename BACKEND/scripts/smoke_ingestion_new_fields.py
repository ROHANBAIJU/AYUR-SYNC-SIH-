"""Smoke test for new ingestion columns (short_definition, long_definition, vernacular_term).

Usage (inside repo root, with container running and valid ADMIN_TOKEN env set):
  docker exec ayur-sync-api python scripts/smoke_ingestion_new_fields.py

Steps:
  1. Constructs an in-memory CSV with new columns.
  2. POSTs to /api/admin/ingest/upload
  3. Fetches batch rows and asserts fields round-trip.
"""
import os, io, json, csv, textwrap
import requests

API_BASE = os.getenv("SMOKE_API_BASE", "http://localhost:8000/api")
TOKEN = os.getenv("ADMIN_TOKEN") or os.getenv("ACCESS_TOKEN")
if not TOKEN:
    raise SystemExit("Set ADMIN_TOKEN (Bearer token) in environment for smoke test")

headers = {"Authorization": f"Bearer {TOKEN}"}

csv_rows = [
    {
        "system": "ayurveda",
        "code": "AY-900",
        "term": "Test Kapha Imbalance",
        "suggested_icd_name": "Kapha Imbalance Placeholder",
        "short_definition": "Disturbance of kapha",
        "long_definition": "A longer explanatory definition regarding kapha imbalance for testing.",
        "vernacular_term": "कफ विकार",
    },
    {
        "system": "unani",
        "code": "UN-123",
        "term": "Balgham Excess",
        "suggested_icd_name": "Balgham Excess Placeholder",
        "short_definition": "Excess phlegm",
        "long_definition": "Chronic production of balgham leading to respiratory symptoms.",
        "vernacular_term": "बलगम अधिकता",
    },
]

fieldnames = [
    "system","code","term","suggested_icd_name","short_definition","long_definition","vernacular_term"
]
buf = io.StringIO()
writer = csv.DictWriter(buf, fieldnames=fieldnames)
writer.writeheader()
for r in csv_rows:
    writer.writerow(r)
data = buf.getvalue().encode("utf-8")

files = {"file": ("smoke_ingestion.csv", data, "text/csv")}
print("[SMOKE] Uploading test CSV...")
resp = requests.post(f"{API_BASE}/admin/ingest/upload", headers=headers, files=files)
if resp.status_code != 200:
    print(resp.text)
    raise SystemExit(f"Upload failed: {resp.status_code}")
result = resp.json()
batch_id = result.get("batch_id")
print(f"[SMOKE] Uploaded batch {batch_id} -> {json.dumps(result, indent=2)}")

print("[SMOKE] Fetching batch rows...")
rows_resp = requests.get(f"{API_BASE}/admin/ingest/batches/{batch_id}/rows", headers=headers)
if rows_resp.status_code != 200:
    print(rows_resp.text)
    raise SystemExit(f"Fetch rows failed: {rows_resp.status_code}")
rows_data = rows_resp.json()
print(json.dumps(rows_data, indent=2, ensure_ascii=False))

def assert_field(row, name):
    if not row.get(name):
        raise AssertionError(f"Row {row.get('id')} missing field {name}")

for row in rows_data.get("rows", []):
    assert_field(row, "short_definition")
    assert_field(row, "long_definition")
    assert_field(row, "vernacular_term")

print("[SMOKE] SUCCESS: New fields present and populated in API response.")
