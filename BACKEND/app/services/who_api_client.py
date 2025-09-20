import requests
import os
from fastapi import HTTPException
from cachetools import cached, TTLCache
import certifi  # For SSL certificate verification
from typing import Optional

# --- Configuration ---
WHO_API_CLIENT_ID = os.getenv("WHO_API_CLIENT_ID")
WHO_API_CLIENT_SECRET = os.getenv("WHO_API_CLIENT_SECRET")
WHO_TOKEN_URL = os.getenv("WHO_TOKEN_URL")
WHO_ALLOW_INSECURE_ICDAPI = os.getenv("WHO_ALLOW_INSECURE_ICDAPI", "0").lower() in ("1", "true", "yes")
WHO_LOCAL_NOAUTH = os.getenv("WHO_LOCAL_NOAUTH", "0").lower() in ("1", "true", "yes")
WHO_ID_BASE = os.getenv("WHO_ID_BASE", "https://id.who.int").rstrip('/')
WHO_ICD_BASE = os.getenv("WHO_ICD_BASE", "https://icd.who.int").rstrip('/')


def _verify_param():
    """Return the 'verify' parameter for requests based on env flags.
    By default use certifi CA bundle; if WHO_ALLOW_INSECURE_ICDAPI is set, disable verification (dev only)."""
    return False if WHO_ALLOW_INSECURE_ICDAPI else certifi.where()


# --- In-memory Cache Configuration ---
token_cache = TTLCache(maxsize=1, ttl=3000)
entity_cache = TTLCache(maxsize=500, ttl=86400)
tm2_entity_cache = TTLCache(maxsize=500, ttl=86400)
foundation_search_cache = TTLCache(maxsize=500, ttl=86400)


@cached(token_cache)
def get_who_api_token():
    """Fetch an OAuth2 token, or return None when WHO_LOCAL_NOAUTH is enabled or creds are missing (local dev)."""
    if WHO_LOCAL_NOAUTH or not all([WHO_API_CLIENT_ID, WHO_API_CLIENT_SECRET, WHO_TOKEN_URL]):
        return None

    payload = {
        'client_id': WHO_API_CLIENT_ID,
        'client_secret': WHO_API_CLIENT_SECRET,
        'grant_type': 'client_credentials',
        'scope': 'icdapi_access'
    }
    try:
        r = requests.post(
            WHO_TOKEN_URL,
            data=payload,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            verify=_verify_param()
        )
        r.raise_for_status()
        return r.json().get('access_token')
    except requests.exceptions.RequestException as e:
        print(f"Error fetching WHO API token: {e}")
        raise HTTPException(status_code=503, detail="Could not authenticate with WHO API.")


def get_entity_details(entity_uri: str):
    """Fetch the full details for a given ICD-11 entity URI (supports optional auth)."""
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    try:
        # Prefer https only for who.int URIs to avoid breaking local http
        if entity_uri.startswith("http://") and ("who.int" in entity_uri):
            entity_uri = "https://" + entity_uri[len("http://"):]
        r = requests.get(entity_uri, headers=headers, verify=_verify_param())
        r.raise_for_status()
        return r.json()
    except requests.exceptions.RequestException:
        return None


def _entity_id_from_uri(entity_uri: str) -> Optional[str]:
    try:
        return entity_uri.rstrip('/').split('/')[-1]
    except Exception:
        return None


def fetch_linearized_entity(entity_id: str, linearization: str):
    """
    Fetches a linearized entity (e.g., MMS or TM2) by foundation entity id.
    Example: https://icd.who.int/icdapi/release/11/mms/entity/{id}
             https://icd.who.int/icdapi/release/11/tm2/entity/{id}
    """
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    # Try multiple URL patterns for better compatibility across WHO deployments
    url_variants = [
        f"{WHO_ICD_BASE}/icdapi/release/11/{linearization}/entity/{entity_id}",
        f"{WHO_ICD_BASE}/icdapi/release/11/{linearization}/entities/{entity_id}",
        f"{WHO_ID_BASE}/icd/release/11/{linearization}/entity/{entity_id}",
        f"{WHO_ID_BASE}/icd/release/11/{linearization}/entities/{entity_id}",
        # Query-style linearization on id base
        f"{WHO_ID_BASE}/icd/entity/{entity_id}?linearizationName={linearization}",
        f"{WHO_ID_BASE}/icd/entity/{entity_id}?releaseId=2024-01&linearizationName={linearization}",
        f"{WHO_ID_BASE}/icd/entity/{entity_id}?linearizationName={linearization}&releaseId=2024-01",
    ]
    for url in url_variants:
        try:
            r = requests.get(url, headers=headers, verify=_verify_param())
            if r.status_code >= 400:
                continue
            return r.json()
        except requests.exceptions.RequestException:
            continue
    return None


def _normalize_search_entity(ent: dict) -> Optional[dict]:
    """Normalize a search "destinationEntities" item into an entity-like dict with code, title, and @id."""
    if not ent:
        return None
    code = ent.get('code')
    title = ent.get('title')
    if isinstance(title, dict):
        title_obj = title
    elif isinstance(title, str):
        title_obj = {'@value': title}
    else:
        title_obj = None
    ent_id = ent.get('id') or ent.get('@id')
    return {'code': code, 'title': title_obj, '@id': ent_id}


def mms_search_by_release(term: str, release: Optional[str] = None) -> Optional[dict]:
    """Search MMS for a term at a specific release and return first normalized entity with code if available."""
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    rel = release or "2025-01"
    urls = [
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/mms/search?q={term}",
        f"{WHO_ID_BASE}/icd/release/11/{rel}/mms/search?q={term}",
        # Single-language endpoint variant
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/mms-sl/search?q={term}",
    ]
    for url in urls:
        try:
            r = requests.get(url, headers=headers, verify=_verify_param())
            if r.status_code >= 400:
                continue
            data = r.json()
            ents = data.get('destinationEntities', [])
            if not ents:
                continue
            # Prefer an entity that actually has a code
            for e in ents:
                norm = _normalize_search_entity(e)
                if norm and norm.get('code'):
                    return norm
            # If none had a code, follow the first entity id to fetch details (often returns code)
            ent_id_url = ents[0].get('id') if ents else None
            if ent_id_url:
                try:
                    rr = requests.get(ent_id_url, headers=headers, verify=_verify_param())
                    if rr.status_code < 400:
                        d = rr.json()
                        code = d.get('code')
                        title = d.get('title')
                        if code or title:
                            return {'code': code, 'title': title, '@id': d.get('@id') or ent_id_url}
                except requests.exceptions.RequestException:
                    pass
        except requests.exceptions.RequestException:
            continue
    return None


def tm2_search_by_release(term: str, release: Optional[str] = None) -> Optional[dict]:
    """Search TM2 for a term at a specific release and return first normalized entity with code if available."""
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    rel = release or "2025-01"
    urls = [
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/tm2/search?q={term}",
        f"{WHO_ID_BASE}/icd/release/11/{rel}/tm2/search?q={term}",
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/tm2-sl/search?q={term}",
    ]
    for url in urls:
        try:
            r = requests.get(url, headers=headers, verify=_verify_param())
            if r.status_code >= 400:
                continue
            data = r.json()
            ents = data.get('destinationEntities', [])
            if not ents:
                continue
            for e in ents:
                norm = _normalize_search_entity(e)
                if norm and norm.get('code'):
                    return norm
            ent_id_url = ents[0].get('id') if ents else None
            if ent_id_url:
                try:
                    rr = requests.get(ent_id_url, headers=headers, verify=_verify_param())
                    if rr.status_code < 400:
                        d = rr.json()
                        code = d.get('code')
                        title = d.get('title')
                        if code or title:
                            return {'code': code, 'title': title, '@id': d.get('@id') or ent_id_url}
                except requests.exceptions.RequestException:
                    pass
        except requests.exceptions.RequestException:
            continue
    return None

@cached(entity_cache)
def search_and_fetch_entity(icd_name: str):
    """
    Searches for an ICD-11 entity and fetches its details.
    1) Try id.who.int entity search (stable cert chain observed)
    2) Fallback to icd.who.int mms-sl search
    Returns the full entity details JSON or None.
    """
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    search_urls = [
        f"{WHO_ID_BASE}/icd/entity/search?q={icd_name}",
        f"{WHO_ICD_BASE}/icdapi/release/11/mms-sl/search?q={icd_name}",
    ]

    for url in search_urls:
        try:
            r = requests.get(url, headers=headers, verify=_verify_param())
            r.raise_for_status()
            data = r.json()
            entities = data.get('destinationEntities', [])
            if not entities:
                continue
            entity_uri = entities[0].get('id')
            if not entity_uri:
                continue
            # Try MMS linearized form first to get an MMS code if available
            ent_id = _entity_id_from_uri(entity_uri)
            if ent_id:
                mms_data = fetch_linearized_entity(ent_id, 'mms')
                if mms_data and (mms_data.get('code') or mms_data.get('title')):
                    return mms_data
            # Fallback to foundation entity details
            entity = get_entity_details(entity_uri)
            if entity and (entity.get('code') or entity.get('title')):
                return entity
            # As a last resort, try the MMS search endpoint that often includes codes in results
            try:
                rr = requests.get(f"{WHO_ICD_BASE}/icdapi/release/11/mms-sl/search?q={icd_name}", headers=headers, verify=_verify_param())
                rr.raise_for_status()
                d2 = rr.json()
                ents2 = d2.get('destinationEntities', [])
                if ents2:
                    norm = _normalize_search_entity(ents2[0])
                    if norm:
                        return norm
            except requests.exceptions.RequestException:
                pass
            return None
        except requests.exceptions.RequestException as e:
            print(f"Error searching WHO API with URL {url}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected error from WHO search {url}: {e}")
            continue
    return None


@cached(tm2_entity_cache)
def search_and_fetch_tm2(term: str):
    """
    Best-effort TM2 fetch:
    1) Search id.who.int to get foundation entity id
    2) Fetch TM2 linearized entity by id (to get codes like SM31)
    3) Fallbacks are silently ignored if not available
    """
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    # Step 1: Foundation search
    try:
        r = requests.get(f"{WHO_ID_BASE}/icd/entity/search?q={term}", headers=headers, verify=_verify_param())
        r.raise_for_status()
        data = r.json()
        entities = data.get('destinationEntities', [])
        if not entities:
            # Fallback: TM2 linearization search endpoints
            for url in [
                f"{WHO_ICD_BASE}/icdapi/release/11/tm2/sl/search?q={term}",
                f"{WHO_ICD_BASE}/icdapi/release/11/tm2/search?q={term}",
            ]:
                try:
                    rr = requests.get(url, headers=headers, verify=_verify_param())
                    rr.raise_for_status()
                    d2 = rr.json()
                    ents2 = d2.get('destinationEntities', [])
                    if not ents2:
                        continue
                    ent_uri2 = ents2[0].get('id')
                    ent_id2 = _entity_id_from_uri(ent_uri2 or '')
                    if not ent_id2:
                        continue
                    tm2_data2 = fetch_linearized_entity(ent_id2, 'tm2')
                    if tm2_data2 and (tm2_data2.get('code') or tm2_data2.get('title')):
                        return tm2_data2
                except requests.exceptions.RequestException:
                    continue
            return None
        ent_uri = entities[0].get('id')
        ent_id = _entity_id_from_uri(ent_uri or '')
        if not ent_id:
            return None
        # Step 2: Fetch TM2 linearized
        tm2_data = fetch_linearized_entity(ent_id, 'tm2')
        if tm2_data and (tm2_data.get('code') or tm2_data.get('title')):
            return tm2_data
        # If linearized fetch didn't work, try tm2 search endpoints for a code
        for url in [
            f"{WHO_ICD_BASE}/icdapi/release/11/tm2/sl/search?q={term}",
            f"{WHO_ICD_BASE}/icdapi/release/11/tm2/search?q={term}",
        ]:
            try:
                rr = requests.get(url, headers=headers, verify=_verify_param())
                rr.raise_for_status()
                d2 = rr.json()
                ents2 = d2.get('destinationEntities', [])
                if ents2:
                    norm = _normalize_search_entity(ents2[0])
                    if norm:
                        return norm
            except requests.exceptions.RequestException:
                continue
    except requests.exceptions.RequestException as e:
        print(f"TM2 search failed: {e}")
        return None
    except Exception as e:
        print(f"TM2 search unexpected error: {e}")
        return None
    return None


def search_tm2_by_terms(terms: list[str]):
    """Try TM2 search for a list of alternative terms; return first matching entity-like dict."""
    for t in terms:
        res = search_and_fetch_tm2(t)
        if res:
            return res
    return None


def fetch_linearized_entity_by_release(entity_id: str, linearization: str, release: Optional[str] = None):
    """
    Fetch a linearized entity (MMS/TM2) for a specific release by foundation entity id.
    Example: https://icd.who.int/icdapi/release/11/2025-01/mms/entity/{id}
    """
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    rel = release or "2025-01"
    url_variants = [
        # icdapi entity/entities variants
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/{linearization}/entity/{entity_id}",
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/{linearization}/entities/{entity_id}",
        # Short-path variants (no 'entity') often used by ECT 'uri'
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/{linearization}/{entity_id}",
        f"{WHO_ICD_BASE}/icdapi/release/11/{rel}/{linearization}/{entity_id}/unspecified",
        # id.who.int aliases
        f"{WHO_ID_BASE}/icd/release/11/{rel}/{linearization}/entity/{entity_id}",
        f"{WHO_ID_BASE}/icd/release/11/{rel}/{linearization}/entities/{entity_id}",
        f"{WHO_ID_BASE}/icd/release/11/{rel}/{linearization}/{entity_id}",
        f"{WHO_ID_BASE}/icd/release/11/{rel}/{linearization}/{entity_id}/unspecified",
    ]
    for url in url_variants:
        try:
            r = requests.get(url, headers=headers, verify=_verify_param())
            if r.status_code >= 400:
                continue
            return r.json()
        except requests.exceptions.RequestException:
            continue
    return None


@cached(foundation_search_cache)
def search_foundation_uri(term: str) -> Optional[str]:
    """Return the first foundation entity URI for a search term (id base, optional auth)."""
    token = get_who_api_token()
    headers = {'Accept': 'application/json', 'API-Version': 'v2', 'Accept-Language': 'en'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    try:
        r = requests.get(f"{WHO_ID_BASE}/icd/entity/search?q={term}", headers=headers, verify=_verify_param())
        r.raise_for_status()
        data = r.json()
        entities = data.get('destinationEntities', [])
        if not entities:
            return None
        return entities[0].get('id')
    except requests.exceptions.RequestException:
        return None