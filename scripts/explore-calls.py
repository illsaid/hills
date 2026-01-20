#!/usr/bin/env python
"""Explore the LAPD Calls for Service dataset"""
import requests
import json
from collections import Counter

API = "https://data.lacity.org/resource/xjgu-z4ju.json"

# Get Hollywood calls from recent data
params = {
    "$where": "area_occ='Hollywood' AND dispatch_date >= '2024-12-01T00:00:00.000'",
    "$limit": 500
}

print("Fetching Hollywood calls from Dec 2024+...")
r = requests.get(API, params=params)
data = r.json()
print(f"Retrieved {len(data)} calls\n")

# Count call types
call_types = Counter(d.get('call_type_text', 'Unknown') for d in data)

print("=== TOP 30 CALL TYPES ===")
for call_type, count in call_types.most_common(30):
    print(f"  {count:4d}  {call_type}")

# Look for security-relevant keywords
print("\n=== SECURITY-RELEVANT CALLS ===")
keywords = ['459', '484', '487', 'ALARM', 'SUSP', 'PROWLER', 'TRES', 'BURGL', 'THEFT', 'VANDAL', 'GTA']
for call_type in sorted(set(d.get('call_type_text', '') for d in data)):
    if any(kw in call_type.upper() for kw in keywords):
        count = call_types[call_type]
        print(f"  {count:4d}  {call_type}")
