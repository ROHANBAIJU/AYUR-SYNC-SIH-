import os
import json
import time
import requests

# --- CONFIGURATION ---
CLIENT_ID = "4a15cecc-f4fb-464b-935e-bc1530bb5f28_2a2114d9-b94a-4b00-9448-ffc37d75115d"
CLIENT_SECRET = "Fo6Zinxw7gSD1qJWgDq4fvtX4Sn1hGH4p7yVJ2VGnXg="
TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token"
BASE_URL = "https://id.who.int/icd/entity"
TOKEN_CACHE_FILE = "token.cache.json"

# --- AUTHENTICATION ---

def get_access_token():
    """Fetches and caches the API access token."""
    if os.path.exists(TOKEN_CACHE_FILE):
        with open(TOKEN_CACHE_FILE, 'r') as f:
            token_data = json.load(f)
        if time.time() < token_data.get('expires_at', 0) - 60:
            return token_data['access_token']
    
    print("-> Fetching new API access token...")
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
        print("-> Token obtained successfully.")
        return token_data['access_token']
    except requests.exceptions.RequestException as e:
        print(f"    [Error] Could not get access token. Reason: {e}")
        raise

# --- CORE FUNCTION ---

def fetch_single_entity_details(entity_id):
    """
    Fetches and prints all details for a single entity ID.
    """
    try:
        access_token = get_access_token()
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'API-Version': 'v2'
        }

        entity_url = f"{BASE_URL}/{entity_id}"
        print(f"\n-> Attempting to fetch details from: {entity_url}")
        
        response = requests.get(entity_url, headers=headers, timeout=20)
        response.raise_for_status() # This will raise an error for 4xx or 5xx responses

        # If successful, print the details
        details = response.json()
        print("\n" + "="*50)
        print("✅ SUCCESS! ENTITY DETAILS FETCHED:")
        print("="*50)
        
        # Pretty print the entire JSON response
        print(json.dumps(details, indent=2, ensure_ascii=False))
        
        print("="*50)

    except requests.exceptions.HTTPError as e:
        print(f"\n❌ HTTP ERROR: Could not fetch details for ID '{entity_id}'.")
        print(f"   Status Code: {e.response.status_code}")
        print(f"   Reason: {e.response.text}")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred: {e}")


# --- MAIN APPLICATION ---

def main():
    """Main function to run the tool."""
    entity_id_to_test = input("Enter the Entity ID you want to fetch (e.g., 111326490 for Adhmanam): ")
    if entity_id_to_test:
        fetch_single_entity_details(entity_id_to_test)

if __name__ == "__main__":
    main()