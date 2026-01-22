import os, json
from datetime import datetime
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Signal Guard Keywords
LOCAL_FILTERS = ["West Bureau", "Hollywood Hills", "FS 41", "FS 82", "FS 76", "Runyon", "Nichols", "Canyon", "Mulholland"]

def get_gmail_service():
    creds_info = json.loads(os.environ['GMAIL_TOKEN'])
    creds = Credentials.from_authorized_user_info(creds_info)
    return build('gmail', 'v1', credentials=creds)

def fetch_lafd_alerts(service):
    query = 'from:lafd-alert@lacity.org OR "LAFD Alert"'
    results = service.users().messages().list(userId='me', q=query, maxResults=5).execute()
    messages = []
    for msg in results.get('messages', []):
        content = service.users().messages().get(userId='me', id=msg['id']).execute()
        snippet = content['snippet']
        if any(k.lower() in snippet.lower() for k in LOCAL_FILTERS):
            messages.append(snippet)
    return messages

def summarize_with_gemini(alerts):
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel("gemini-1.5-flash")
    prompt = f"Summarize these LAFD alerts for a neighborhood dashboard. Focus on location and severity. Be concise. Alerts: {alerts}"
    response = model.generate_content(prompt)
    return response.text

def main():
    service = get_gmail_service()
    alerts = fetch_lafd_alerts(service)
    pulse_data = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "status": "Active" if alerts else "Clear",
        "summary": summarize_with_gemini(alerts) if alerts else "No active incidents in the Hills."
    }
    os.makedirs('data', exist_ok=True)
    with open('data/intelligence_pulse.json', 'w') as f:
        json.dump(pulse_data, f, indent=2)

if __name__ == "__main__":
    main()
