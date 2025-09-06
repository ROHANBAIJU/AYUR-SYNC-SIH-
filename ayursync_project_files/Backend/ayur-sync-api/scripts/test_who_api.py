import requests
import json
import os

# --- Configuration ---
# IMPORTANT: Replace these with the credentials you received from WHO after registering.
# For security, it's best to set these as environment variables rather than hardcoding.
CLIENT_ID = os.getenv("WHO_CLIENT_ID", "4a15cecc-f4fb-464b-935e-bc1530bb5f28_2a2114d9-b94a-4b00-9448-ffc37d75115d")
CLIENT_SECRET = os.getenv("WHO_CLIENT_SECRET", "Fo6Zinxw7gSD1qJWgDq4fvtX4Sn1hGH4p7yVJ2VGnXg=")

TOKEN_ENDPOINT = "https://icdaccessmanagement.who.int/connect/token"
API_BASE_URL = "https://id.who.int"

def get_who_api_token() -> str | None:
    """
    Authenticates with the WHO server to get a temporary access token.
    """
    print("Requesting access token from WHO API...")
    try:
        # The body of the request to get the token
        token_payload = {
            'grant_type': 'client_credentials',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'scope': 'icdapi_access'
        }
        
        # Make the POST request to the token endpoint
        response = requests.post(TOKEN_ENDPOINT, data=token_payload, timeout=10)
        
        # Check if the request was successful
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

def search_icd_term(search_query: str):
    """
    Searches for a clinical term using the WHO ICD-11 API.
    """
    # First, get our authentication token
    token = get_who_api_token()
    
    if not token:
        print("\nCould not perform search without a valid token.")
        return

    print(f"\nSearching for term: '{search_query}'...")
    
    try:
        # Prepare the headers for our API request, including the token
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json',
            'Accept-Language': 'en', # We want results in English
            'API-Version': 'v2'
        }

        # Prepare the full URL for the search
        search_url = f"{API_BASE_URL}/icd/entity/search?q={search_query}"
        
        # Make the GET request to the search endpoint
        response = requests.get(search_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("  -> Search successful!")
            # The response is a list of search results. Let's pretty-print it.
            search_results = response.json()
            print("\n--- API Response ---")
            print(json.dumps(search_results, indent=2))
            print("--------------------\n")
        else:
            print(f"  -> Error during search: {response.status_code} - {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"  -> A network error occurred during search: {e}")


if __name__ == "__main__":
    # This is where we run our test.
    # Replace the search query with any term you want to test.
    TEST_QUERY = "Rheumatoid arthritis"
    search_icd_term(TEST_QUERY)
