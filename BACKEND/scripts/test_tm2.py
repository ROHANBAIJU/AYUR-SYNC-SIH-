import os
import csv
import json
import time
import requests
from thefuzz import process, fuzz

# --- CONFIGURATION ---

# 1. API Credentials
CLIENT_ID = "4a15cecc-f4fb-464b-935e-bc1530bb5f28_2a2114d9-b94a-4b00-9448-ffc37d75115d"
CLIENT_SECRET = "Fo6Zinxw7gSD1qJWgDq4fvtX4Sn1hGH4p7yVJ2VGnXg="
TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"

# 2. ICD-11 API and Search Settings
BASE_URL = "https://id.who.int/icd/entity"
TM2_CHAPTER_ID = "562274788"
CACHE_FILE = "tm2_data_100.cache.csv"
TOKEN_CACHE_FILE = "token.cache.json"
MATCH_CONFIDENCE_THRESHOLD = 80
ENTITY_FETCH_LIMIT = 100

# --- AUTHENTICATION ---

def get_access_token():
    """Fetches and caches the API access token."""
    token_cache_exists = os.path.exists(TOKEN_CACHE_FILE)
    if token_cache_exists:
        with open(TOKEN_CACHE_FILE, 'r') as f:
            token_data = json.load(f)
        if time.time() < token_data.get('expires_at', 0) - 60:
            print(f"  -> Valid token found in '{TOKEN_CACHE_FILE}'. Using cached token.")
            return token_data['access_token']
    
    print("  -> Fetching new API access token...")
    token_payload = {
        'grant_type': 'client_credentials', 'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET, 'scope': 'icdapi_access'
    }
    try:
        response = requests.post(TOKEN_URL, data=token_payload, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        token_data['expires_at'] = time.time() + token_data['expires_in']
        with open(TOKEN_CACHE_FILE, 'w') as f:
            json.dump(token_data, f)
        return token_data['access_token']
    except requests.exceptions.RequestException as e:
        print(f"    [Error] Could not get access token. Reason: {e}")
        raise

# --- CORE FUNCTIONS ---

def get_api_headers():
    """Constructs the required headers for API requests."""
    access_token = get_access_token()
    return {
        'Authorization': f'Bearer {access_token}', 'Accept': 'application/json',
        'Accept-Language': 'en', 'API-Version': 'v2'
    }

def fetch_and_write_recursively(entity_id, headers, fetched_ids, counter, csv_writer):
    """
    Recursively fetches entities until the ENTITY_FETCH_LIMIT is reached.
    """
    if counter['count'] >= ENTITY_FETCH_LIMIT:
        return

    if entity_id in fetched_ids:
        return

    print(f"  -> Fetching entity ID: {entity_id}")

    entity_url = f"{BASE_URL}/{entity_id}"
    try:
        response = requests.get(entity_url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"    [Error] Failed to fetch {entity_id}. Reason: {e}")
        return

    entity_data = response.json()
    fetched_ids.add(entity_id)
    
    if entity_data.get('code'):
        counter['count'] += 1
        title = entity_data.get('title', {}).get('@value', 'Untitled Entity')
        code = entity_data.get('code', 'No Code')
        uri = entity_data.get('@id', '')
        
        csv_writer.writerow([counter['count'], title, code, uri])
        print(f"     ✅ ({counter['count']}/{ENTITY_FETCH_LIMIT}) Success! Wrote '{title}' to CSV.")

    if 'child' in entity_data:
        for child_uri in entity_data['child']:
            if counter['count'] >= ENTITY_FETCH_LIMIT:
                break
            # ✅ BUG FIX: This line was missing. It extracts the ID from the child's full URL.
            child_id = child_uri.split('/')[-1]
            fetch_and_write_recursively(child_id, headers, fetched_ids, counter, csv_writer)

def update_local_cache():
    """
    Opens a CSV file and fetches a limited number of entities.
    """
    print(f"Starting cache update for the first {ENTITY_FETCH_LIMIT} entities...")
    try:
        headers = get_api_headers()
        fetched_ids = set()
        counter = {'count': 0}
        
        with open(CACHE_FILE, 'w', newline='', encoding='utf-8') as f:
            csv_writer = csv.writer(f)
            csv_writer.writerow(['Serial No', 'Title', 'ICD Code', 'URI'])
            fetch_and_write_recursively(TM2_CHAPTER_ID, headers, fetched_ids, counter, csv_writer)
        
        cache_location = os.path.abspath(CACHE_FILE)
        print("\n" + "="*50)
        print("✅ CACHE CREATION COMPLETE!")
        print(f"\n   - Entities Written to CSV: {counter['count']}")
        print(f"   - Location: {cache_location}")
        print("="*50)

    except Exception as e:
        print(f"[Error] An unexpected error occurred: {e}")

def search_disease(query):
    """Searches for a disease in the local CSV cache."""
    if not os.path.exists(CACHE_FILE):
        print(f"\n❌ '{CACHE_FILE}' not found. Please update the cache first.")
        return

    data = []
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({'title': row['Title'], 'code': row['ICD Code'], 'uri': row['URI']})
            
    if not data:
        print("\n❌ Cache file is empty. Please update the cache first.")
        return

    choices = {item['title']: item for item in data}
    print(f"\nSearching for '{query}'...")

    best_match = process.extractOne(query, choices.keys(), scorer=fuzz.token_set_ratio)

    if best_match and best_match[1] >= MATCH_CONFIDENCE_THRESHOLD:
        match_title, score = best_match
        match_data = choices[match_title]
        print("\n--- Match Found! ---")
        print(f"  Confidence: {score:.0f}%")
        print(f"  Title:      {match_data['title']}")
        print(f"  ICD Code:   {match_data['code']}")
        print(f"  URI:        {match_data['uri']}")
        print("--------------------")
    else:
        print("\n❌ No confident match found.")

def clear_local_cache():
    """Deletes the stored CSV cache file."""
    if os.path.exists(CACHE_FILE):
        try:
            os.remove(CACHE_FILE)
            print(f"\n✅ Local entity cache '{CACHE_FILE}' has been cleared.")
        except OSError as e:
            print(f"\n❌ Error: Could not clear cache file. Reason: {e}")
    else:
        print(f"\nℹ️ No local entity cache file ('{CACHE_FILE}') found to clear.")

# --- MAIN APPLICATION INTERFACE ---

def main():
    while True:
        print("\n--- ICD-11 TM2 Disease Search Tool ---")
        print(f"1. Update Local Cache (first {ENTITY_FETCH_LIMIT} entities to CSV)")
        print("2. Search for a Disease (from CSV)")
        print("3. Clear Local Cache (Reset CSV)")
        print("4. Exit")
        
        choice = input("Enter your choice (1-4): ")

        if choice == '1':
            update_local_cache()
        elif choice == '2':
            search_query = input("Enter the disease name to search for: ")
            if search_query:
                search_disease(search_query)
        elif choice == '3':
            clear_local_cache()
        elif choice == '4':
            print("Exiting program. Goodbye!")
            break
        else:
            print("Invalid choice. Please enter a number between 1 and 4.")

if __name__ == "__main__":
    main()