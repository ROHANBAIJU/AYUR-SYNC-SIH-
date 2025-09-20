import os
import sys
import json
import requests
import certifi
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("WHO_API_CLIENT_ID")
CLIENT_SECRET = os.getenv("WHO_API_CLIENT_SECRET")
TOKEN_URL = os.getenv("WHO_TOKEN_URL", "https://icdaccessmanagement.who.int/connect/token")
ALLOW_INSECURE = os.getenv("WHO_ALLOW_INSECURE_ICDAPI", "0").lower() in ("1", "true", "yes")


def _verify():
    return False if ALLOW_INSECURE else certifi.where()


def get_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("ERROR: WHO_API_CLIENT_ID/WHO_API_CLIENT_SECRET missing in .env")
        return None
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'client_credentials',
        'scope': 'icdapi_access'
    }
    try:
        r = requests.post(
            TOKEN_URL,
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            verify=_verify(),
            timeout=30
        )
        r.raise_for_status()
        print("Token OK")
        return r.json().get('access_token')
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Token request failed: {e}")
        return None


def fetch_entity(token: str, uri: str):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
    }
    print(f"\nFetching entity: {uri}")
    try:
        r = requests.get(uri, headers=headers, verify=_verify(), timeout=30)
        r.raise_for_status()
        data = r.json()
        title = (data.get('title') or {}).get('@value')
        code = data.get('code')
        definition = (data.get('definition') or {}).get('@value')
        print("Entity details:")
        print(json.dumps({
            'title': title,
            'code': code,
            'definition': definition,
            'uri': data.get('@id')
        }, indent=2, ensure_ascii=False))
    except requests.exceptions.RequestException as e:
        print(f"Entity fetch failed: {e}")


def fetch_linearized(token: str, entity_id: str, linearization: str):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
    }
    urls = [
        f"https://icd.who.int/icdapi/release/11/{linearization}/entity/{entity_id}",
        f"https://icd.who.int/icdapi/release/11/{linearization}/entities/{entity_id}",
        f"https://id.who.int/icd/release/11/{linearization}/entity/{entity_id}",
        f"https://id.who.int/icd/release/11/{linearization}/entities/{entity_id}",
    ]
    for url in urls:
        try:
            print(f"\nFetching {linearization.upper()} linearized: {url}")
            r = requests.get(url, headers=headers, verify=_verify(), timeout=30)
            if r.status_code >= 400:
                print(f"Status {r.status_code} for {url}")
                continue
            data = r.json()
            title = (data.get('title') or {}).get('@value')
            code = data.get('code')
            print(json.dumps({'linearization': linearization, 'code': code, 'title': title, 'uri': data.get('@id')}, indent=2, ensure_ascii=False))
            return
        except requests.exceptions.RequestException as e:
            print(f"Linearized fetch failed: {e}")


def try_search(token: str, term: str):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
    }
    urls = [
        f"https://id.who.int/icd/entity/search?q={term}",
        f"https://icd.who.int/icdapi/release/11/mms-sl/search?q={term}",
    ]
    for url in urls:
        print(f"\nSearching: {url}")
        try:
            r = requests.get(url, headers=headers, verify=_verify(), timeout=30)
            r.raise_for_status()
            data = r.json()
            entities = data.get('destinationEntities', [])
            print(f"Found {len(entities)} entities")
            if not entities:
                continue
            entity_uri = entities[0].get('id')
            print(f"Best URI: {entity_uri}")
            if entity_uri:
                fetch_entity(token, entity_uri)
                ent_id = (entity_uri.rstrip('/').split('/')[-1]) if entity_uri else None
                if ent_id:
                    fetch_linearized(token, ent_id, 'mms')
                    fetch_linearized(token, ent_id, 'tm2')
                return True
        except requests.exceptions.RequestException as e:
            print(f"Search failed: {e}")
        except Exception as e:
            print(f"Unexpected search error: {e}")
    return False


def try_tm2_search(token: str, term: str):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
    }
    urls = [
        f"https://icd.who.int/icdapi/release/11/tm2/sl/search?q={term}",
        f"https://icd.who.int/icdapi/release/11/tm2/search?q={term}",
    ]
    for url in urls:
        try:
            print(f"\nTM2 Searching: {url}")
            r = requests.get(url, headers=headers, verify=_verify(), timeout=30)
            r.raise_for_status()
            data = r.json()
            ents = data.get('destinationEntities', [])
            print(f"TM2 found {len(ents)} entities")
            if ents:
                ent = ents[0]
                print(json.dumps({'code': ent.get('code'), 'title': ent.get('title'), 'id': ent.get('id')}, indent=2, ensure_ascii=False))
                return True
        except requests.exceptions.RequestException as e:
            print(f"TM2 search failed: {e}")
        except Exception as e:
            print(f"TM2 unexpected search error: {e}")
    return False


if __name__ == "__main__":
    term = sys.argv[1] if len(sys.argv) > 1 else "Abdominal distension"
    token = get_token()
    if not token:
        sys.exit(1)
    ok = try_search(token, term)
    if not ok:
        print("\nNo entity found or all searches failed.")
    try_tm2_search(token, term)
    # Release-aware MMS/TM2 searches (expected to yield codes like ME01 on 2025-01)
    try:
        rel = os.getenv("WHO_TEST_RELEASE", "2025-01")
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
            'API-Version': 'v2',
            'Accept-Language': 'en'
        }
        mms_url = f"https://icd.who.int/icdapi/release/11/{rel}/mms/search?q={term}"
        tm2_url = f"https://icd.who.int/icdapi/release/11/{rel}/tm2/search?q={term}"
        print(f"\nRelease-aware MMS search: {mms_url}")
        r1 = requests.get(mms_url, headers=headers, verify=_verify(), timeout=30)
        if r1.status_code < 400:
            d1 = r1.json(); ents = d1.get('destinationEntities', [])
            if ents:
                print(json.dumps({'MMS_first': {'code': ents[0].get('code'), 'title': ents[0].get('title')}}, indent=2, ensure_ascii=False))
        print(f"\nRelease-aware TM2 search: {tm2_url}")
        r2 = requests.get(tm2_url, headers=headers, verify=_verify(), timeout=30)
        if r2.status_code < 400:
            d2 = r2.json(); ents2 = d2.get('destinationEntities', [])
            if ents2:
                print(json.dumps({'TM2_first': {'code': ents2[0].get('code'), 'title': ents2[0].get('title')}}, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Release-aware search failed: {e}")