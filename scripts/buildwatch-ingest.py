#!/usr/bin/env python
"""
BuildWatch Ingestion Script
Fetches LADBS Building & Safety Inspections from Socrata and caches to Supabase.

Dataset: https://data.lacity.org/resource/9w5z-rg2h.json

Usage:
  python buildwatch-ingest.py                    # Default: last 365 days, up to 10k rows
  python buildwatch-ingest.py --days 90          # Last 90 days
  python buildwatch-ingest.py --no-distance-cap  # Skip distance filtering (citywide)
"""

import requests
import json
import os
import re
import hashlib
import argparse
import math
from datetime import datetime, timedelta
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    load_dotenv()
except ImportError:
    pass

# LADBS Building & Safety Inspections dataset
API_ENDPOINT = "https://data.lacity.org/resource/9w5z-rg2h.json"

# Hollywood Hills demo anchor point (for distance filtering)
ANCHOR_LAT = 34.1074
ANCHOR_LON = -118.3406
DEFAULT_DISTANCE_CAP_KM = 27  # ~27km radius covers Hollywood Hills + buffer

# Result classification patterns (checked in order)
# "Ready for Inspection" must be neutral, NOT fail
NEUTRAL_PATTERNS = ['ready for inspection', 'scheduled', 'pending', 'in progress', 
                    'waiting', 'on hold', 'rescheduled']
FAIL_PATTERNS = ['failed', 'not approved', 'correction', 'reinspect', 'no access', 
                 'denied', 'disapproved', 'not ready', 'cancelled', 'violation']
PASS_PATTERNS = ['passed', 'approved', 'ok', 'complete', 'final ok', 'permit closed']

# High-severity inspection types (regex patterns)
HIGH_SEVERITY_TYPES = re.compile(r'(final|foundation|framing|seismic|grading|fire|structural)', re.IGNORECASE)


def haversine_km(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two lat/lon points in kilometers.
    """
    R = 6371  # Earth's radius in km
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def classify_result(result_text):
    """
    Classify inspection result into pass/fail/neutral.
    Returns (result_class, is_failure)
    
    IMPORTANT: Check neutral patterns FIRST to ensure "Ready for Inspection" is neutral.
    """
    if not result_text:
        return 'neutral', False
    
    lower = result_text.lower().strip()
    
    # Check neutral patterns FIRST (ensures "Ready for Inspection" is neutral)
    for pattern in NEUTRAL_PATTERNS:
        if pattern in lower:
            return 'neutral', False
    
    # Check fail patterns
    for pattern in FAIL_PATTERNS:
        if pattern in lower:
            return 'fail', True
    
    # Check pass patterns
    for pattern in PASS_PATTERNS:
        if pattern in lower:
            return 'pass', False
    
    # Default to neutral if unknown
    return 'neutral', False


def compute_severity(result_class, inspection_type):
    """
    Compute severity: high if fail + critical type, med if fail, low otherwise.
    """
    if result_class != 'fail':
        return 'low'
    
    # Check if inspection type is high-severity
    if inspection_type and HIGH_SEVERITY_TYPES.search(inspection_type):
        return 'high'
    
    return 'med'


def generate_source_row_id(record):
    """
    Generate unique ID for a record.
    Uses Socrata :id if available, otherwise hash of key fields.
    """
    # Try Socrata system ID first
    socrata_id = record.get(':id')
    if socrata_id:
        return f"socrata:{socrata_id}"
    
    # Fallback: hash of key fields
    key_parts = [
        str(record.get('permit', '')),
        str(record.get('inspection_date', '')),
        str(record.get('inspection', '')),
        str(record.get('address', '')),
        str(record.get('inspection_result', ''))
    ]
    key_string = '|'.join(key_parts)
    return f"hash:{hashlib.sha1(key_string.encode()).hexdigest()[:16]}"


def fetch_inspections_paginated(start_date, end_date, target_rows=10000, distance_cap_km=None):
    """
    Fetch inspections with offset pagination until target_rows or exhausted.
    Uses $order=inspection_date DESC, $limit=5000, $offset paging.
    
    Optionally applies distance cap from Hollywood Hills anchor point.
    """
    start_str = start_date.strftime("%Y-%m-%dT00:00:00.000")
    end_str = end_date.strftime("%Y-%m-%dT23:59:59.999")
    
    where_clause = f"inspection_date >= '{start_str}' AND inspection_date <= '{end_str}'"
    
    page_limit = 5000
    offset = 0
    all_records = []
    filtered_count = 0
    
    print(f"   📅 Date range: {start_date.date()} to {end_date.date()}")
    if distance_cap_km:
        print(f"   📍 Distance cap: {distance_cap_km}km from Hollywood Hills ({ANCHOR_LAT}, {ANCHOR_LON})")
    
    while len(all_records) < target_rows:
        params = {
            "$where": where_clause,
            "$limit": page_limit,
            "$offset": offset,
            "$order": "inspection_date DESC",
            "$$app_token": os.environ.get("LACITY_APP_TOKEN")
        }
        
        try:
            print(f"   🔄 Fetching page (offset={offset})...")
            response = requests.get(API_ENDPOINT, params=params, timeout=90)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                print(f"   ✅ Pagination complete (no more data)")
                break
            
            print(f"   📦 Fetched {len(data)} records from Socrata")
            
            # Apply distance filtering if enabled
            if distance_cap_km:
                before_filter = len(data)
                filtered_data = []
                for record in data:
                    location = record.get('lat_lon')
                    if location and isinstance(location, dict):
                        try:
                            lat = float(location.get('latitude'))
                            lon = float(location.get('longitude'))
                            dist = haversine_km(ANCHOR_LAT, ANCHOR_LON, lat, lon)
                            if dist <= distance_cap_km:
                                filtered_data.append(record)
                            else:
                                filtered_count += 1
                        except (TypeError, ValueError):
                            # No valid coords, skip
                            filtered_count += 1
                    else:
                        # No coords, skip
                        filtered_count += 1
                
                data = filtered_data
                print(f"   🎯 After distance filter: {len(data)} records (filtered {before_filter - len(data)})")
            
            all_records.extend(data)
            offset += page_limit
            
            # Stop if we got fewer than limit (no more pages)
            if len(data) < page_limit and not distance_cap_km:
                print(f"   ✅ Reached end of data")
                break
                
            # Safety: if Socrata returned full page but we're not getting enough after filter
            if distance_cap_km and len(data) == 0 and offset > 50000:
                print(f"   ⚠️ Distance filter too restrictive, stopping at offset {offset}")
                break
                
        except Exception as e:
            print(f"   ⚠️ API Error: {e}")
            break
    
    if distance_cap_km:
        print(f"   📊 Total: {len(all_records)} records within {distance_cap_km}km ({filtered_count} filtered out)")
    else:
        print(f"   📊 Total: {len(all_records)} records fetched")
    
    return all_records[:target_rows]


def save_inspections_to_db(inspections):
    """
    Upsert inspections to Supabase recent_inspections table.
    Computes result_class and is_failure from inspection_result.
    """
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("   ❌ Missing Supabase URL/Key")
        return 0, 0, 0

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        # Upsert: on conflict with source_row_id, merge duplicates
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }
    
    rows = []
    with_coords = 0
    failures = 0
    
    # Track result_class distribution for logging
    class_counts = {'pass': 0, 'fail': 0, 'neutral': 0}
    
    for record in inspections:
        # Extract lat/lon from lat_lon object
        lat = None
        lon = None
        location = record.get('lat_lon')
        
        if location and isinstance(location, dict):
            try:
                lat = float(location.get('latitude'))
                lon = float(location.get('longitude'))
                with_coords += 1
            except (TypeError, ValueError):
                pass
        
        # Classify result - this sets result_class and is_failure
        result_text = record.get('inspection_result', '')
        result_class, is_failure = classify_result(result_text)
        
        class_counts[result_class] += 1
        if is_failure:
            failures += 1
        
        # Compute severity based on result_class
        inspection_type = record.get('inspection', '')
        severity = compute_severity(result_class, inspection_type)
        
        # Generate unique ID
        source_row_id = generate_source_row_id(record)
        
        rows.append({
            "source": "ladbs_inspections",
            "source_row_id": source_row_id,
            "permit": record.get('permit'),
            "address_text": record.get('address'),
            "inspection_type": inspection_type,
            "inspection_result": result_text,
            "permit_status": record.get('permit_status'),
            "inspection_date": record.get('inspection_date'),
            "lat": lat,
            "lon": lon,
            "location": location,  # Store raw for debugging
            "result_class": result_class,
            "is_failure": is_failure,
            "severity": severity,
            "raw": record
        })
    
    if not rows:
        return 0, 0, 0
    
    # Deduplicate by source_row_id (keep last occurrence)
    seen_ids = {}
    for row in rows:
        seen_ids[row['source_row_id']] = row
    rows = list(seen_ids.values())
    
    print(f"   📋 {len(rows)} unique inspections after dedup")
    print(f"   📊 Classification: {class_counts['pass']} pass, {class_counts['fail']} fail, {class_counts['neutral']} neutral")
    
    # Batch upsert (Supabase has a row limit, so chunk if needed)
    batch_size = 500  # Smaller batches for stability
    total_upserted = 0
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        try:
            # Use on_conflict for proper upsert behavior
            r = requests.post(
                f"{url}/rest/v1/recent_inspections?on_conflict=source_row_id", 
                json=batch, 
                headers=headers
            )
            if r.status_code not in (200, 201):
                print(f"   ❌ DB Insert Failed ({r.status_code}): {r.text[:200]}")
            else:
                total_upserted += len(batch)
                print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} rows")
        except Exception as e:
            print(f"   ❌ DB Error: {e}")
    
    return total_upserted, with_coords, failures


def main():
    parser = argparse.ArgumentParser(description="BuildWatch Ingestion")
    parser.add_argument("--days", type=int, default=365, help="Days to look back (default: 365)")
    parser.add_argument("--target", type=int, default=10000, help="Target row count (default: 10000)")
    parser.add_argument("--no-distance-cap", action="store_true", help="Skip distance filtering (citywide)")
    parser.add_argument("--distance-km", type=float, default=DEFAULT_DISTANCE_CAP_KM, 
                        help=f"Distance cap in km from Hollywood Hills (default: {DEFAULT_DISTANCE_CAP_KM})")
    args = parser.parse_args()
    
    days = args.days
    target = args.target
    distance_cap = None if args.no_distance_cap else args.distance_km
    
    print(f"🏗️  BuildWatch Ingestion")
    print(f"   📆 Looking back {days} days")
    print(f"   🎯 Target: {target} rows")
    if distance_cap:
        print(f"   📍 Distance cap: {distance_cap}km from Hollywood Hills")
    else:
        print(f"   🌐 Citywide (no distance cap)")
    print()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    inspections = fetch_inspections_paginated(start_date, end_date, target, distance_cap)
    
    if inspections:
        upserted, with_coords, failures = save_inspections_to_db(inspections)
        print(f"\n✅ Ingestion complete:")
        print(f"   • {upserted} inspections upserted")
        print(f"   • {with_coords} with coordinates")
        print(f"   • {failures} failures (is_failure=true)")
    else:
        print("   ⚠️ No inspections found")


if __name__ == "__main__":
    main()
