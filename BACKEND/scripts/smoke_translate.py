import os
import sys
import requests

BASE_URL = os.getenv("TRANSLATE_BASE", "http://localhost:8000")
ICD_NAME = sys.argv[1] if len(sys.argv) > 1 else os.getenv("ICD_NAME", "Abdominal distension")
RELEASE = os.getenv("ICD_RELEASE", "2025-01")

def try_call(path: str):
    url = f"{BASE_URL.rstrip('/')}{path}"
    params = {"icd_name": ICD_NAME, "release": RELEASE}
    r = requests.get(url, params=params, timeout=30)
    print(f"GET {r.url} -> {r.status_code}")
    r.raise_for_status()
    return r.json()

try:
    # First try /api/public/translate, then fallback to /public/translate
    try:
        data = try_call("/api/public/translate")
    except requests.exceptions.HTTPError as e:
        if getattr(e.response, 'status_code', None) == 404:
            data = try_call("/public/translate")
        else:
            raise
    icd = data.get("icd") or {}
    code = icd.get("code")
    title = icd.get("name")
    print("ICD code:", code)
    print("ICD title:", title)
    if not code:
        print("Warning: No ICD code returned. Check release, icd_name, or verification status.")
except requests.exceptions.RequestException as e:
    print("Request failed:", e)
    sys.exit(1)
