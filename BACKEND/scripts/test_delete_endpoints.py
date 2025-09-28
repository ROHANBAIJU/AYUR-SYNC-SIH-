"""Quick script to verify ingestion DELETE endpoints.

Usage (PowerShell):
  $env:API_BASE="http://127.0.0.1:8000/api"; $env:TOKEN="<ADMIN_TOKEN>"; python scripts/test_delete_endpoints.py

Actions:
  1. Create a tiny temp batch via upload (in-memory CSV)
  2. List batches, find the new one
  3. Delete the batch
  4. Confirm it's gone
  5. (Optional) negative delete test on same id again expecting 404
"""
from __future__ import annotations
import os, io, csv, time, sys, json
import requests

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api")
TOKEN = os.environ.get("TOKEN") or os.environ.get("ADMIN_TOKEN")
if not TOKEN:
    print("ERROR: set TOKEN or ADMIN_TOKEN env var with a valid bearer token", file=sys.stderr)
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def _check(r: requests.Response, expect=200):
    if r.status_code != expect:
        print("STATUS", r.status_code, "BODY", r.text[:400])
        raise SystemExit(f"Expected {expect} got {r.status_code}")
    return r

def create_temp_batch():
    # Minimal CSV columns system,term
    rows = [
        {"system": "ayurveda", "term": f"temp-term-{int(time.time())}", "short_definition": "tmp", "long_definition": "long tmp", "vernacular_term": "vernacular"}
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader(); writer.writerows(rows)
    buf.seek(0)
    files = {"file": ("temp_batch.csv", buf.read().encode("utf-8"), "text/csv")}
    r = requests.post(f"{API_BASE}/admin/ingest/upload", headers=HEADERS, files=files)
    _check(r)
    data = r.json()
    print("Created batch", data)
    return data["batch_id"]

def list_batches():
    r = requests.get(f"{API_BASE}/admin/ingest/batches", headers=HEADERS)
    _check(r)
    return r.json()["batches"]

def delete_batch(batch_id: int, expect=200):
    r = requests.delete(f"{API_BASE}/admin/ingest/batches/{batch_id}", headers=HEADERS)
    if r.status_code != expect:
        print("DELETE status", r.status_code, "body", r.text)
        raise SystemExit(f"Unexpected delete status {r.status_code}")
    print("Deleted batch", batch_id, "->", r.json())

if __name__ == "__main__":
    bid = create_temp_batch()
    batches = list_batches()
    assert any(b["id"] == bid for b in batches), "New batch not found in list"
    delete_batch(bid)
    batches_after = list_batches()
    assert not any(b["id"] == bid for b in batches_after), "Batch still present after delete"
    # Negative test
    r = requests.delete(f"{API_BASE}/admin/ingest/batches/{bid}", headers=HEADERS)
    if r.status_code != 404:
        print("WARNING: expected 404 on second delete, got", r.status_code)
    else:
        print("Second delete returned 404 as expected")
    print("All delete endpoint checks passed.")
