#!/usr/bin/env python
"""Simple runtime smoke test against the running container.

Usage (inside host):
  docker exec ayur-sync-api python scripts/smoke_test.py --release v1-submission --system ayurveda --code "SM31(AAC-12)" --token <JWT>

If --token omitted, a JWT will be generated with the dev SECRET_KEY.
Exit code 0 = all pass; non‑zero on first failure.
"""
import argparse, sys, json, urllib.request, urllib.parse, time, os
from jose import jwt

DEFAULT_BASE = os.environ.get("SMOKE_BASE", "http://localhost:8000/api")
SECRET = os.environ.get("SECRET_KEY", "a_very_secret_key_for_development_change_me")

def build_token():
    import datetime
    return jwt.encode({"sub": "smoke", "exp": int((datetime.datetime.utcnow()+datetime.timedelta(minutes=30)).timestamp())}, SECRET, algorithm="HS256")

def call(path, params=None, token=None):
    qs = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"{DEFAULT_BASE}{path}{qs}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read().decode()
        return r.status, data

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--release', required=True)
    ap.add_argument('--system', required=True)
    ap.add_argument('--code', required=True)
    ap.add_argument('--token')
    ap.add_argument('--use-abha', action='store_true', help='Use mock ABHA token (ABHA_demo) instead of JWT')
    args = ap.parse_args()
    if args.use_abha:
        token = 'ABHA_demo'
    else:
        token = args.token or build_token()
    failures = 0

    def check(name, cond, detail):
        nonlocal failures
        if cond:
            print(f"[PASS] {name} {detail}")
        else:
            print(f"[FAIL] {name} {detail}")
            failures += 1

    # CapabilityStatement
    try:
        st, body = call('/fhir/metadata', token=token)
        js = json.loads(body)
        check('metadata', st == 200 and js.get('resourceType')=='CapabilityStatement', f"status={st}")
    except Exception as e:
        check('metadata', False, str(e))

    # ValueSet expand (release scoped)
    print(f"[DEBUG] Using JWT (first 20 chars) {token[:20]}...")
    try:
        st, body = call('/fhir/ValueSet/$expand', params={"system": args.system, "count": 5, "release": args.release}, token=token)
        js = json.loads(body)
        contains = len(js.get('expansion', {}).get('contains', []))
        check('valueset.expand', st==200 and contains>=0, f"status={st} count={contains}")
    except Exception as e:
        check('valueset.expand', False, str(e))

    # ConceptMap translate – try $ path first then alias
    translate_ok = False
    # Ensure code safely encoded (parentheses etc.)
    import urllib.parse
    raw_code = args.code  # pass raw; urlencode will encode parentheses once
    # Try alias first because some shells / proxies may mangle the $ path
    for p in ['/fhir/ConceptMap/translate', '/fhir/ConceptMap/$translate']:
        if translate_ok:
            break
        try:
            st, body = call(p, params={"system": args.system, "code": raw_code, "release": args.release}, token=token)
            js = json.loads(body)
            if st == 200 and js.get('resourceType') == 'Parameters':
                translate_ok = True
                check('conceptmap.translate', True, f"path={p} status={st}")
        except Exception as e:
            # Collect last error for debug if final attempt fails
            last_err = str(e)
    if not translate_ok:
        detail = f"no route succeeded (last error: {last_err})" if 'last_err' in locals() else "no route succeeded"
        check('conceptmap.translate', False, detail)

    if failures:
        print(f"[SMOKE] FAILED with {failures} failing checks")
        return 1
    print("[SMOKE] All checks passed")
    return 0

if __name__ == '__main__':
    sys.exit(main())
