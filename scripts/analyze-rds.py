#!/usr/bin/env python
"""
Analyze Reporting Districts (RDs) in Hollywood Division
to help identify which ones correspond to the "Hills".
"""
import requests
import json
from collections import Counter

# Calls for Service API
API = "https://data.lacity.org/resource/xjgu-z4ju.json"

params = {
    "$where": "area_occ='Hollywood' AND dispatch_date >= '2024-12-01T00:00:00.000'",
    "$limit": 2000,
    "$select": "rpt_dist"
}

print("Fetching Hollywood RDs...")
r = requests.get(API, params=params)
data = r.json()

rds = [d.get('rpt_dist') for d in data if d.get('rpt_dist')]
counts = Counter(rds)

print(f"\nFound {len(counts)} unique Reporting Districts in Hollywood Division.\n")
print("RD     Count   Description (Estimated)")
print("-" * 40)

# Sort by RD number
for rd, count in sorted(counts.items()):
    # Heuristic: Hills RDs are often 062x, 063x, 064x
    note = ""
    if rd.startswith("062") or rd.startswith("063") or rd.startswith("064"):
        note = " (Possible Hills)"
    
    print(f"{rd}   {count:4d}   {note}")
