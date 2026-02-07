import os, json
from datetime import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

import os, json
import re
from datetime import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Manually load env files since python-dotenv might not be available
def load_env_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                key, value = line.split('=', 1)
                # Don't overwrite existing env vars
                if key.strip() not in os.environ:
                    os.environ[key.strip()] = value.strip()

load_env_file('.env.local')
load_env_file('.env')

# Signal Guard Keywords
LOCAL_FILTERS = ["West Bureau", "Hollywood Hills", "FS 41", "FS 82", "FS 76", "Runyon", "Nichols", "Canyon", "Mulholland"]

def get_gmail_service():
    token_str = os.environ.get('GMAIL_TOKEN')
    if not token_str:
        raise ValueError("Missing GMAIL_TOKEN environment variable")
        
    # Handle potential single quotes from .env file
    if token_str.startswith("'") and token_str.endswith("'"):
        token_str = token_str[1:-1]
        
    creds_info = json.loads(token_str)
    
    # Extract client_id and client_secret
    if 'GMAIL_CREDENTIALS' in os.environ:
        gmail_creds = json.loads(os.environ['GMAIL_CREDENTIALS'])
        cred_data = gmail_creds.get('installed') or gmail_creds.get('web') or gmail_creds
        creds_info['client_id'] = cred_data['client_id']
        creds_info['client_secret'] = cred_data['client_secret']
    else:
        # Fallback to direct env vars
        creds_info['client_id'] = os.environ.get('GMAIL_CLIENT_ID')
        creds_info['client_secret'] = os.environ.get('GMAIL_CLIENT_SECRET')
        
    if not creds_info['client_id'] or not creds_info['client_secret']:
        raise ValueError("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET")

    creds = Credentials.from_authorized_user_info(creds_info)
    return build('gmail', 'v1', credentials=creds)

def fetch_lafd_alerts(service):
    query = 'from:lafd-alert@lacity.org OR "LAFD Alert"'
    results = service.users().messages().list(userId='me', q=query, maxResults=10).execute()
    messages = []
    
    if 'messages' in results:
        for msg in results['messages']:
            try:
                content = service.users().messages().get(userId='me', id=msg['id']).execute()
                snippet = content.get('snippet', '')
                
                # Check for matches
                if any(k.lower() in snippet.lower() for k in LOCAL_FILTERS):
                    # Clean up the snippet using regex
                    # Remove "LAFD Alert" (case insensitive), "This is a message...", "Image did not load"
                    clean_text = re.sub(r'(?i)(lafd alert\s*\.?|this is a message from.*?alert|image did not load)', '', snippet)
                    # Remove dots/punctuation at the start
                    clean_text = re.sub(r'^[\.\s:-]+', '', clean_text)
                    # Collapse multiple spaces
                    clean_text = " ".join(clean_text.split())
                    messages.append(clean_text)
            except Exception as e:
                print(f"Error processing message {msg['id']}: {e}")
                
    return messages

def format_summary(alerts):
    if not alerts:
        return "No active incidents in the Hills."
    
    count = len(alerts)
    latest = alerts[0]
    return f"Monitor Active: {count} recent incident(s). Latest: {latest}"

def main():
    try:
        service = get_gmail_service()
        alerts = fetch_lafd_alerts(service)
        
        pulse_data = {
            "last_updated": datetime.utcnow().isoformat() + "Z",
            "status": "Active" if alerts else "Clear",
            "summary": format_summary(alerts),
            "alerts": alerts  # Also saving the raw alerts list for display
        }
        
        os.makedirs('data', exist_ok=True)
        with open('data/intelligence_pulse.json', 'w') as f:
            json.dump(pulse_data, f, indent=2)
            
        print(f"Successfully updated pulse with {len(alerts)} alerts")
        
    except Exception as e:
        print(f"Failed to update pulse: {e}")
        exit(1)

if __name__ == "__main__":
    main()
