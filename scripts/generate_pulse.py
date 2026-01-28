import os, json
from datetime import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Signal Guard Keywords
LOCAL_FILTERS = ["West Bureau", "Hollywood Hills", "FS 41", "FS 82", "FS 76", "Runyon", "Nichols", "Canyon", "Mulholland"]

def get_gmail_service():
    creds_info = json.loads(os.environ['GMAIL_TOKEN'])
    # Extract client_id and client_secret from GMAIL_CREDENTIALS
    gmail_creds = json.loads(os.environ['GMAIL_CREDENTIALS'])
    # Handle both 'installed' and 'web' credential types
    cred_data = gmail_creds.get('installed') or gmail_creds.get('web') or gmail_creds
    creds_info['client_id'] = cred_data['client_id']
    creds_info['client_secret'] = cred_data['client_secret']
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
                    # Clean up the snippet
                    clean_text = snippet.replace('LAFD Alert', '').strip()
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
