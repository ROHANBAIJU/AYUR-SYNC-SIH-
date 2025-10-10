"""Probe all available generative models and report which support generate_content.

Saves results to gemini_model_probe_full_results.json and prints a colored
✓ for success and ✗ for failure (falls back to plain symbols if color not available).

Run with the same Python you use for the project, e.g.:
  D:/PP12/python.exe d:/AYUR-SYNC-API/BACKEND/app/tests/ai_tester.py

This script loads the project's .env (so keep it in BACKEND/.env) and writes results
to the repo root.
"""

import os
import sys
import time
import json
import traceback
from dotenv import load_dotenv
import google.generativeai as genai

# Load .env so GEMINI_API_KEY is available
load_dotenv(r"d:\AYUR-SYNC-API\BACKEND\.env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY environment variable not set. Aborting.")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)

def safe_name(m):
    for attr in ("name", "model", "id"):
        try:
            v = getattr(m, attr)
            if v:
                return str(v)
        except Exception:
            pass
    return str(m)

def try_import_colorama():
    try:
        import colorama
        colorama.init()
        return colorama
    except Exception:
        return None

colorama = try_import_colorama()
GREEN = '\u001b[32m' if colorama else ''
RED = '\u001b[31m' if colorama else ''
RESET = '\u001b[0m' if colorama else ''

tick = '✓'
cross = '✗'

results = []

print("Listing models from the API (this may take a few seconds)...")
try:
    listed = genai.list_models()
except Exception as e:
    print("Failed to list models:", e)
    listed = []

model_names = []
for m in listed:
    name = safe_name(m)
    model_names.append(name)

print(f"Found {len(model_names)} models.")

# Probe each model discovered
for name in model_names:
    print(f"\nProbing: {name}")
    start = time.time()
    entry = {"model": name, "ok": False, "elapsed_s": None, "error": None}
    try:
        model = genai.GenerativeModel(name)
        # Try a tiny generate_content request. Some models may not support it and will raise.
        try:
            resp = model.generate_content("Return token OK")
            text = getattr(resp, 'text', None) or str(resp)
            elapsed = time.time() - start
            entry.update({"ok": True, "elapsed_s": elapsed, "raw": text})
            print(f"  {GREEN}{tick}{RESET} OK ({elapsed:.2f}s)")
        except Exception as inner_e:
            elapsed = time.time() - start
            entry.update({"ok": False, "elapsed_s": elapsed, "error": str(inner_e)})
            print(f"  {RED}{cross}{RESET} Failed ({elapsed:.2f}s) -> {inner_e}")
    except Exception as e:
        elapsed = time.time() - start
        entry.update({"ok": False, "elapsed_s": elapsed, "error": str(e)})
        print(f"  {RED}{cross}{RESET} Failed to construct model client ({elapsed:.2f}s) -> {e}")
        traceback.print_exc()

    results.append(entry)

# Summary print: show ticks for all
print("\n\n=== SUMMARY ===")
ok_count = 0
for r in results:
    mark = tick if r.get('ok') else cross
    if r.get('ok'):
        ok_count += 1
        print(f"{GREEN}{mark}{RESET} {r['model']}  ({r['elapsed_s']:.2f}s)")
    else:
        print(f"{RED}{mark}{RESET} {r['model']}  error={r.get('error')} ")

print(f"\nWorking models: {ok_count}/{len(results)}")

out_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '..', '..', 'gemini_model_probe_full_results.json')
# Fallback to repo root if path construction looks odd
out_file = os.path.abspath('gemini_model_probe_full_results.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nFull results written to {out_file}")