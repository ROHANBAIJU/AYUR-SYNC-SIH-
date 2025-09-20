import requests
import json
import os
import re
import sys
import certifi

# --- Configuration ---
CLIENT_ID = os.getenv("WHO_CLIENT_ID", os.getenv("WHO_API_CLIENT_ID", ""))
CLIENT_SECRET = os.getenv("WHO_CLIENT_SECRET", os.getenv("WHO_API_CLIENT_SECRET", ""))
TOKEN_ENDPOINT = os.getenv("WHO_TOKEN_URL", "https://icdaccessmanagement.who.int/connect/token")
# Base URL for entity/search (id.who.int) and linearized (icd.who.int) can differ; allow override for local
API_BASE_URL = os.getenv("ICD_API_BASE", "https://id.who.int")
ICD_HOST_BASE = os.getenv("ICD_LINEAR_BASE", "https://icd.who.int")
CT_BASE = os.getenv("ICD_CT_BASE")  # Optional: base for Coding Tool style URLs like http://localhost:8382
ALLOW_INSECURE = os.getenv("WHO_ALLOW_INSECURE_ICDAPI", "0").lower() in ("1","true","yes")
RELEASE = os.getenv("ICD_RELEASE", "2025-01")
LANG = os.getenv("ICD_LANG", "en")

# Optional URL templates for local CT endpoints. Use tokens: {BASE}, {RELEASE}, {LANG}, {TERM}, {ID}
SEARCH_URL_TEMPLATE = os.getenv("ICD_SEARCH_URL_TEMPLATE")
ENTITY_URL_TEMPLATE = os.getenv("ICD_ENTITY_URL_TEMPLATE")

# Optional extra headers for CT (e.g., Cookie/Authorization) as JSON string
EXTRA_HEADERS_JSON = os.getenv("ICD_EXTRA_HEADERS_JSON")
EXTRA_HEADERS = {}
if EXTRA_HEADERS_JSON:
    try:
        EXTRA_HEADERS = json.loads(EXTRA_HEADERS_JSON)
    except Exception:
        print("Warning: ICD_EXTRA_HEADERS_JSON is not valid JSON; ignoring.")

def _verify():
    return False if ALLOW_INSECURE else certifi.where()


def get_who_api_token() -> str | None:
    """
    Authenticates with the WHO server to get a temporary access token.
    """
    print("Requesting access token from WHO API...")
    try:
        token_payload = {
            'grant_type': 'client_credentials',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'scope': 'icdapi_access'
        }
        response = requests.post(TOKEN_ENDPOINT, data=token_payload, timeout=20, verify=_verify())
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            print("  -> Successfully obtained access token.")
            return access_token
        else:
            print(f"  -> Error getting token: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"  -> A network error occurred: {e}")
    return None

def clean_html(raw_html: str) -> str:
    """
    A simple function to remove HTML tags from the text.
    """
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext

def display_entity_details(entity_data: dict):
    """
    Parses and prints the key details from the entity data in a clean format.
    """
    print("\n--- Top Result Details ---")
    
    # Title can be a dict (WHO json) or a plain string (some CT responses)
    raw_title = entity_data.get('title')
    if isinstance(raw_title, dict):
        title = clean_html(raw_title.get('@value', 'N/A'))
    else:
        title = clean_html(str(raw_title)) if raw_title is not None else 'N/A'

    code = entity_data.get('code', entity_data.get('theCode', 'N/A'))
            
    print(f"ICD-11 Code: {code}")
    print(f"Title: {title}")

    synonyms = entity_data.get('synonym', [])
    if synonyms:
        print("\nSynonyms:")
        for synonym in synonyms:
            synonym_label = clean_html(synonym.get('label', {}).get('@value', ''))
            print(f"  - {synonym_label}")
            
    print("------------------------\n")

def _entity_id_from_uri(u: str) -> str | None:
    try:
        return u.rstrip('/').split('/')[-1]
    except Exception:
        return None


def search_icd_term(search_query: str):
    """
    Searches for a clinical term and then fetches details for the top result.
    """
    token = None
    # If running local api without auth, allow skip when CLIENT_ID/SECRET are empty
    if CLIENT_ID and CLIENT_SECRET:
        token = get_who_api_token()
        if not token:
            print("\nCould not perform search without a valid token.")
            return

    print(f"\nSearching for term: '{search_query}'...")
    
    try:
        headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'API-Version': 'v2'
        }
        if token:
            headers['Authorization'] = f'Bearer {token}'

        # Prefer release-aware MMS search to match Coding Tool
        search_variants = []
        ct_template_used = False
        # If a custom template is provided (e.g., CT style), use it first
        if SEARCH_URL_TEMPLATE:
            base = CT_BASE or API_BASE_URL
            turl = SEARCH_URL_TEMPLATE.format(BASE=base, RELEASE=RELEASE, LANG=LANG, TERM=search_query)
            search_variants.append((turl, 'CT'))  # mark as CT
            ct_template_used = True
        # Standard WHO ICD API variants (GET)
        search_variants.extend([
            (f"{ICD_HOST_BASE}/icdapi/release/11/{RELEASE}/mms/search", 'WHO'),
            (f"{ICD_HOST_BASE}/icdapi/release/11/latest/mms/search", 'WHO'),
            (f"{ICD_HOST_BASE}/icdapi/release/11/{RELEASE}/mms-sl/search", 'WHO'),
            (f"{API_BASE_URL}/icd/release/11/{RELEASE}/mms/search", 'WHO'),
        ])

        destination_entities = []
        ct_search_statuses = []
        for s_url, kind in search_variants:
            try:
                if kind == 'CT':
                    # ECT typically uses POST for search. Try POST with {q} and {query}; then GET fallback.
                    for body in ( {'q': search_query}, {'query': search_query} ):
                        try:
                            ct_headers = {**headers, 'Content-Type': 'application/json'}
                            if EXTRA_HEADERS:
                                ct_headers.update(EXTRA_HEADERS)
                            ct_resp = requests.post(s_url, headers=ct_headers,
                                                    data=json.dumps(body), timeout=20, verify=_verify())
                            ct_search_statuses.append((s_url, 'POST', ct_resp.status_code))
                            if ct_resp.status_code < 400:
                                search_results = ct_resp.json()
                                destination_entities = (
                                    search_results.get('destinationEntities')
                                    if isinstance(search_results, dict) else search_results
                                ) or []
                                # Some CTs return results directly as a list
                                if destination_entities:
                                    print(f"  -> CT POST search succeeded at: {s_url}")
                                    break
                        except requests.exceptions.RequestException:
                            ct_search_statuses.append((s_url, 'POST', 'conn-error'))
                            continue
                    if destination_entities:
                        break
                    # GET fallback with q param
                    try:
                        ct_headers = {**headers}
                        if EXTRA_HEADERS:
                            ct_headers.update(EXTRA_HEADERS)
                        search_response = requests.get(s_url, headers=ct_headers, params={'q': search_query}, timeout=20, verify=_verify())
                        ct_search_statuses.append((s_url, 'GET', search_response.status_code))
                        if search_response.status_code < 400:
                            search_results = search_response.json()
                            destination_entities = (
                                search_results.get('destinationEntities')
                                if isinstance(search_results, dict) else search_results
                            ) or []
                            if destination_entities:
                                print(f"  -> CT GET search succeeded at: {s_url}")
                                break
                    except requests.exceptions.RequestException:
                        ct_search_statuses.append((s_url, 'GET', 'conn-error'))
                        continue
                else:
                    # WHO style search via GET
                    search_response = requests.get(s_url, headers=headers, params={'q': search_query}, timeout=20, verify=_verify())
                    if search_response.status_code >= 400:
                        print(f"  -> Search variant {s_url} returned {search_response.status_code}")
                        continue
                    search_results = search_response.json()
                    destination_entities = search_results.get('destinationEntities', [])
                    if destination_entities:
                        print(f"  -> Search successful at: {s_url}")
                        break
            except requests.exceptions.RequestException:
                print(f"  -> Search variant failed to connect: {s_url}")
                continue

        if ct_template_used and not destination_entities and ct_search_statuses:
            # Report CT search attempts for debugging
            for (u, m, s) in ct_search_statuses:
                print(f"  -> CT search {m} {u} -> {s}")

        if not destination_entities:
            print("  -> No matching entities found in MMS search variants.")
            destination_entities = []

        if destination_entities:
            # Normalize entries: CT may use 'uri' for detail link, and include 'code' already
            chosen = None
            for ent in destination_entities:
                if ent.get('code') or ent.get('theCode'):
                    chosen = ent
                    break
            if not chosen:
                chosen = destination_entities[0]

            # If CT already provided code and title, print directly
            if chosen.get('code') or chosen.get('theCode'):
                print("  -> Using code from search result (CT-style response).")
                display_entity_details({
                    'code': chosen.get('code') or chosen.get('theCode'),
                    'title': chosen.get('title') or chosen.get('label') or chosen.get('bestMatchText') or 'N/A',
                    'synonym': []
                })
                return

            # Otherwise, follow the detail URI
            top_result_uri = chosen.get('id') or chosen.get('uri')
            if top_result_uri:
                print(f"  -> Found top result. Fetching details from: {top_result_uri}")
                try:
                    detail_response = requests.get(top_result_uri, headers=headers, timeout=20, verify=_verify())
                    if detail_response.status_code == 200:
                        entity_details = detail_response.json()
                        display_entity_details(entity_details)
                        return
                    else:
                        print(f"  -> Detail fetch returned {detail_response.status_code}: {detail_response.text[:200]}")
                except requests.exceptions.RequestException:
                    pass

        # If we reach here, try foundation search then linearized fetch for the release
        print("  -> Trying foundation search fallback…")
        try:
            # Foundation search (id-style). If you have a CT-specific foundation search, set a template similarly.
            # If CT is in use, ensure WHO bases are set to real WHO servers for fallback
            who_api_base = API_BASE_URL
            who_linear_base = ICD_HOST_BASE
            if CT_BASE and ("localhost" in API_BASE_URL or API_BASE_URL.startswith("http://") and API_BASE_URL.endswith(":8382")):
                who_api_base = "https://id.who.int"
            if CT_BASE and ("localhost" in ICD_HOST_BASE or ICD_HOST_BASE.startswith("http://") and ICD_HOST_BASE.endswith(":8382")):
                who_linear_base = "https://icd.who.int"

            f_url = f"{who_api_base}/icd/entity/search"
            f_res = requests.get(f_url, headers=headers, params={'q': search_query}, timeout=20, verify=_verify())
            if f_res.status_code == 200:
                f_js = f_res.json(); ents = f_js.get('destinationEntities', [])
                if ents:
                    ent_uri = ents[0].get('id')
                    ent_id = _entity_id_from_uri(ent_uri or '')
                    if ent_id:
                        lin_variants = []
                        # If an entity template is provided (e.g., CT style), use it first
                        if ENTITY_URL_TEMPLATE:
                            base = CT_BASE or who_linear_base
                            turl = ENTITY_URL_TEMPLATE.format(BASE=base, RELEASE=RELEASE, LANG=LANG, ID=ent_id)
                            # Try both singular and plural variants
                            lin_variants.append(turl)
                            if '/entity/' in turl:
                                lin_variants.append(turl.replace('/entity/', '/entities/'))
                            if not turl.endswith('/unspecified'):
                                lin_variants.append(turl.rstrip('/') + '/unspecified')
                        # Standard variants
                        lin_variants.extend([
                            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/entity/{ent_id}",
                            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/entities/{ent_id}",
                            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/{ent_id}",
                            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/{ent_id}/unspecified",
                            f"{who_api_base}/icd/release/11/{RELEASE}/mms/entity/{ent_id}",
                            f"{who_api_base}/icd/release/11/{RELEASE}/mms/entities/{ent_id}",
                            f"{who_api_base}/icd/release/11/{RELEASE}/mms/{ent_id}",
                            f"{who_api_base}/icd/release/11/{RELEASE}/mms/{ent_id}/unspecified",
                        ])
                        for l_url in lin_variants:
                            try:
                                lin_res = requests.get(l_url, headers=headers, timeout=20, verify=_verify())
                                if lin_res.status_code >= 400:
                                    print(f"  -> Linearized variant {l_url} returned {lin_res.status_code}")
                                    continue
                                entity_details = lin_res.json()
                                display_entity_details(entity_details)
                                return
                            except requests.exceptions.RequestException:
                                continue
            else:
                print(f"  -> Foundation search returned {f_res.status_code}: {f_res.text[:200]}")
        except requests.exceptions.RequestException:
            pass

        print("  -> Fallback also failed.")

    except requests.exceptions.RequestException as e:
        print(f"  -> A network error occurred during search: {e}")
    except (IndexError, KeyError):
        print("  -> Could not parse the search results. The API response may have an unexpected format.")

if __name__ == "__main__":
    term = sys.argv[1] if len(sys.argv) > 1 else os.getenv('TEST_QUERY', 'Abdominal distension')
    print(f"Using RELEASE={RELEASE}; API_BASE_URL={API_BASE_URL}; ICD_HOST_BASE={ICD_HOST_BASE}; INSECURE={ALLOW_INSECURE}")
    if CT_BASE:
        print(f"CT_BASE={CT_BASE}")
    if SEARCH_URL_TEMPLATE:
        print(f"SEARCH_URL_TEMPLATE={SEARCH_URL_TEMPLATE}")
    if ENTITY_URL_TEMPLATE:
        print(f"ENTITY_URL_TEMPLATE={ENTITY_URL_TEMPLATE}")
    eid = os.getenv('ENTITY_ID')
    if eid:
        print(f"Testing direct entity id fetch for {eid}…")
        headers = {
            'Accept': 'application/json', 'Accept-Language': 'en', 'API-Version': 'v2'
        }
        # Merge any custom headers (useful for CT proxies that require cookies)
        if EXTRA_HEADERS:
            headers.update(EXTRA_HEADERS)
        if CLIENT_ID and CLIENT_SECRET:
            token = get_who_api_token()
            if token:
                headers['Authorization'] = f'Bearer {token}'
        lin_variants = []
        if ENTITY_URL_TEMPLATE:
            base = CT_BASE or ICD_HOST_BASE
            turl = ENTITY_URL_TEMPLATE.format(BASE=base, RELEASE=RELEASE, LANG=LANG, ID=eid)
            lin_variants.append(turl)
            if '/entity/' in turl:
                lin_variants.append(turl.replace('/entity/', '/entities/'))
            # Try unspecified variant if template points to a specific node
            if not turl.endswith('/unspecified'):
                lin_variants.append(turl.rstrip('/') + '/unspecified')
            # Try CT short-path by removing entity/entities segment
            short_variant = turl.replace('/entity/', '/').replace('/entities/', '/')
            if short_variant != turl:
                lin_variants.append(short_variant)
                if not short_variant.endswith('/unspecified'):
                    lin_variants.append(short_variant.rstrip('/') + '/unspecified')
        # WHO standard fallbacks; if CT is used and bases point to localhost, switch to real WHO for fallback
        who_api_base = API_BASE_URL
        who_linear_base = ICD_HOST_BASE
        if CT_BASE and ('localhost' in API_BASE_URL):
            who_api_base = 'https://id.who.int'
        if CT_BASE and ('localhost' in ICD_HOST_BASE):
            who_linear_base = 'https://icd.who.int'
        lin_variants.extend([
            # WHO icdapi variants (entity/entities)
            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/entity/{eid}",
            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/entities/{eid}",
            # WHO short path (no 'entity') used in ECT 'uri'
            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/{eid}",
            f"{who_linear_base}/icdapi/release/11/{RELEASE}/mms/{eid}/unspecified",
            # id.who.int aliases
            f"{who_api_base}/icd/release/11/{RELEASE}/mms/entity/{eid}",
            f"{who_api_base}/icd/release/11/{RELEASE}/mms/entities/{eid}",
            f"{who_api_base}/icd/release/11/{RELEASE}/mms/{eid}",
            f"{who_api_base}/icd/release/11/{RELEASE}/mms/{eid}/unspecified",
        ])
        for l_url in lin_variants:
            try:
                resp = requests.get(l_url, headers=headers, timeout=20, verify=_verify())
                print(f"  -> {l_url} -> {resp.status_code}")
                if resp.status_code < 400:
                    display_entity_details(resp.json())
                    sys.exit(0)
            except requests.exceptions.RequestException:
                print(f"  -> failed to connect: {l_url}")
        print("No linearized variant worked for the given entity id.")
        sys.exit(1)
    else:
        search_icd_term(term)