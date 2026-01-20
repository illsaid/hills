#!/usr/bin/env python
"""
Neighborhood Maintenance Signals (311)
Source: MyLA311 Cases 2026 (2cy6-i7zn) or Fallback

Tracks infrastructure maintenance requests in Hollywood Hills.
- Filters: Zip Codes 90046, 90068, 90069
- Signals: Top Request Types, Hotspots, Efficiency
- Feed Policy: Surfaces high-severity, clustered items.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import statistics

# Datasets
DATASET_2026 = "2cy6-i7zn"
# Fallback to 2025 if 2026 is empty/error? (ID: 3d6t-x8fk for 2025)
# Using generic endpoint for flexibility
BASE_URL = "https://data.lacity.org/resource/{}.json"

# Config
HILLS_ZIPS = ["90046", "90068", "90069"]
SEVERITY_TYPES = [
    "Bulky Items", "Illegal Dumping", "Metal/Household Appliances", 
    "Electronic Waste", "Graffiti Removal", "Homeless Encampment",
    "Street Light Out", "Pothole" # If available
]

EXCLUDED_TYPES = [
    "Information-Only", "Service Not Complete", "Feedback/Comment",
    "Appointment", "Referral"
]

def fetch_311_data(days=30):
    """Fetch 311 requests for the last N days."""
    
    # Calculate date threshold
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")
    
    # SoQL Query
    # status != 'Canceled' (usually we want valid requests)
    # createddate > cutoff
    # zipcode__c IN list
    
    zips_str = "'" + "', '".join(HILLS_ZIPS) + "'"
    where_clause = f"createddate > '{cutoff}' AND zipcode__c IN ({zips_str})"
    
    params = {
        "$where": where_clause,
        "$limit": 5000,
        "$$app_token": os.environ.get("LACITY_APP_TOKEN", "") 
    }
    
    # Try 2026 Dataset first
    try:
        url = BASE_URL.format(DATASET_2026)
        print(f"🔍 Querying MyLA311 (2026) - {url} ...")
        r = requests.get(url, params=params)
        
        if r.status_code == 200:
            return r.json()
        else:
            print(f"   ⚠️ API Error: {r.status_code} {r.text[:100]}")
            
    except Exception as e:
        print(f"   ⚠️ Connection Error: {e}")
        
    return []

def analyze_signals(data):
    if not data:
        return None

    # Filter out excluded types first
    clean_data = [d for d in data if d.get("type") not in EXCLUDED_TYPES]
    total_reqs = len(clean_data)
    
    # 1. Top Request Types
    # Field: 'type'
    types = [d.get("type") for d in clean_data if d.get("type")]
    type_counts = Counter(types).most_common(5)
    
    # 2. Status & Efficiency
    # Calculate median time to close for closed tickets
    closure_times = []
    open_count = 0
    closed_count = 0
    
    for d in clean_data:
        # Filter exclusions
        rtype = d.get("type", "")
        if rtype in EXCLUDED_TYPES:
            continue
            
        status = d.get("status", "")
        if "Closed" in status:
            closed_count += 1
            created = d.get("createddate")
            updated = d.get("closeddate") or d.get("updateddate") 
            
            if created and updated:
                try:
                    c_dt = datetime.fromisoformat(created.replace("Z", ""))
                    u_dt = datetime.fromisoformat(updated.replace("Z", ""))
                    hours = (u_dt - c_dt).total_seconds() / 3600
                    if hours > 0:
                        closure_times.append(hours)
                except:
                    pass
        else:
            open_count += 1
            
    median_time = 0
    if closure_times:
        median_time = statistics.median(closure_times)
        
    # 3. Hotspots / Feed Items
    # Group by address block (anonymized) to find clusters
    # User Policy: High Severity AND Clustered (>= N in same area)
    
    # Group items by approximate location (address) and Type
    clusters = defaultdict(list)
    
    for d in data:
        rtype = d.get("type")
        if rtype not in SEVERITY_TYPES:
            continue
            
        addr = d.get("address", "Unknown").strip()

        if not addr:
            continue
            
        # Group key: Type + Address (Simple clustering)
        # Assuming address is like "1234 N HIGHLAND AVE"
        # We could group by block "1200 N HIGHLAND AVE" but exact address is fine for now
        key = f"{rtype}|{addr}"
        clusters[key].append(d)
        
    # Filter for N >= 2 (Small cluster)
    feed_items = []
    for key, items in clusters.items():
        if len(items) >= 2:
            # Create a feed item
            rtype, addr = key.split("|")
            
            # Find latest date
            latest_date = max([x.get("createddate") for x in items])
            
            feed_items.append({
                "type": rtype,
                "location": addr,
                "count": len(items),
                "latest_date": latest_date,
                "status": "Active Cluster" if any("Open" in x.get("status", "") for x in items) else "Resolved Cluster"
            })
            
    # Sort feed by date desc
    feed_items.sort(key=lambda x: x["latest_date"], reverse=True)
    
    return {
        "period": "Last 30 Days",
        "total_requests": total_reqs,
        "top_types": [{"type": t, "count": c} for t, c in type_counts],
        "open_count": open_count,
        "closed_count": closed_count,
        "median_closure_hours": round(median_time, 1),
        "hotspots": feed_items[:10] # Top 10 clusters
    }

def main():
    print("Starting Neighborhood Maintenance Signals (311)...")
    
    data = fetch_311_data(days=30)
    
    # Even if data is empty (API down), we generate a valid JSON structure (empty)
    # so the UI doesn't crash.
    
    analysis = analyze_signals(data)
    
    if not analysis:
        # Empty state
        analysis = {
            "period": "Last 30 Days",
            "total_requests": 0,
            "top_types": [],
            "open_count": 0,
            "closed_count": 0,
            "median_closure_hours": 0,
            "hotspots": [],
            "status": "No Data / API Unavailable"
        }
    
    analysis["updated_at"] = datetime.now().isoformat()
    
    # Save
    output_path = os.path.join("data", "maintenance_signals.json")
    os.makedirs("data", exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(analysis, f, indent=2)
        
    print("Analysis complete.")
    print(json.dumps(analysis, indent=2))

if __name__ == "__main__":
    main()
