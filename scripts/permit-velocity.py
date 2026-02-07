#!/usr/bin/env python
"""
Permit Velocity Tracker
Tracks weekly building permit volume for Hollywood Hills (90046, 90068, 90069).
Stores historical data in 'permit_velocity' table for liability/trend analysis.

Usage:
  python permit-velocity.py                  # Normal weekly run
  python permit-velocity.py --backfill-coords  # Backfill missing coordinates
  python permit-velocity.py --backfill-coords --days 365  # Backfill last year
"""

import requests
import json
import os
import sys
import argparse
from datetime import datetime, timedelta
import statistics
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    load_dotenv() # Fallback to .env
except ImportError:
    pass

# LA Open Data: Building Permits
API_ENDPOINT = "https://data.lacity.org/resource/pi9x-tg5x.json"
HILLS_ZIPS = ["90046", "90068", "90069"]

def fetch_permits_range(start_date, end_date):
    """Fetch permits in a date range."""
    end_str = end_date.strftime("%Y-%m-%dT23:59:59.999")
    start_str = start_date.strftime("%Y-%m-%dT00:00:00.000")
    
    zips_str = "'" + "', '".join(HILLS_ZIPS) + "'"
    where_clause = f"issue_date >= '{start_str}' AND issue_date <= '{end_str}' AND zip_code IN ({zips_str})"
    
    params = {
        "$where": where_clause,
        "$limit": 5000,
        "$order": "issue_date DESC",
        "$$app_token": os.environ.get("LACITY_APP_TOKEN")
    }
    
    try:
        response = requests.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"⚠️ API Error: {e}")
        return []

def fetch_weekly_permits(week_ending):
    """Fetch permits for the week ending on the given date."""
    start_date = week_ending - timedelta(days=6)
    return fetch_permits_range(start_date, week_ending)

def save_velocity_to_db(week_ending, zip_code, count, avg_val, yoy):
    """Upsert velocity data to Supabase."""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key: 
        print("   ❌ Missing Supabase URL/Key - Skipping Velocity Save")
        return

    headers = {
        "apikey": key, 
        "Authorization": f"Bearer {key}", 
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = {
        "week_ending": week_ending.strftime("%Y-%m-%d"),
        "zip": zip_code,
        "count": count,
        "avg_value": round(avg_val, 2),
        "yoy_change": round(yoy, 1) if yoy is not None else None
    }
    
    try:
        requests.post(f"{url}/rest/v1/permit_velocity", json=payload, headers=headers)
        print(f"   ✅ Saved {zip_code}: {count} permits")
    except Exception as e:
        print(f"   ❌ DB Error: {e}")

def save_recents_to_db(permits):
    """Upsert raw permit records to 'recent_permits' table with coordinates."""
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key: 
        print("   ❌ Missing Supabase URL/Key - Skipping Recent Permits Save")
        return 0, 0

    headers = {
        "apikey": key, 
        "Authorization": f"Bearer {key}", 
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    # Transform for DB
    rows = []
    with_coords = 0
    missing_coords = 0
    
    for p in permits:
        if not p.get("permit_nbr"): 
            continue
        
        # Safe parse val
        try: 
            val = float(p.get("valuation", "0"))
        except: 
            val = 0
        
        # Check for coordinates
        lat = p.get("lat")
        lon = p.get("lon")
        has_coords = lat is not None and lon is not None
        
        if has_coords:
            with_coords += 1
        else:
            missing_coords += 1
        
        rows.append({
            "permit_number": p["permit_nbr"],
            "address": p.get("primary_address", "Unknown"),
            "zip_code": p.get("zip_code"),
            "apn": p.get("apn"),
            "permit_type": p.get("permit_type") or p.get("permit_sub_type", "Building"),
            "description": p.get("work_desc") or p.get("use_desc", ""),
            "issue_date": p.get("issue_date"),
            "status": p.get("status_desc", "Unknown"),
            "valuation": val,
            "lat": float(lat) if lat else None,
            "lon": float(lon) if lon else None,
            "coords_missing": not has_coords,
            "zimas_url": f"https://zimas.lacity.org/map.aspx?apn={p.get('apn','')}"
        })
    
    if not rows:
        return 0, 0
    
    try:
        # Batch insert/upsert
        r = requests.post(f"{url}/rest/v1/recent_permits", json=rows, headers=headers)
        if r.status_code not in (200, 201):
            print(f"   ❌ DB Insert Failed ({r.status_code}): {r.text}")
        else:
            print(f"   ✅ Upserted {len(rows)} permits ({with_coords} with coords, {missing_coords} missing)")
    except Exception as e:
        print(f"   ❌ DB Error saving raw permits: {e}")
    
    return with_coords, missing_coords

def backfill_coords(days=90):
    """Backfill mode: Re-fetch permits and update coordinates."""
    print(f"🔄 BACKFILL MODE: Fetching permits from last {days} days...")
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    permits = fetch_permits_range(start_date, end_date)
    print(f"   📦 Fetched {len(permits)} permits from LA Open Data")
    
    if permits:
        with_coords, missing = save_recents_to_db(permits)
        print(f"\n✅ Backfill complete:")
        print(f"   • {with_coords} permits with coordinates")
        print(f"   • {missing} permits missing coordinates")
    else:
        print("   ⚠️ No permits found in date range")

def main():
    parser = argparse.ArgumentParser(description="Permit Velocity Tracker")
    parser.add_argument("--backfill-coords", action="store_true", help="Backfill missing coordinates from LA API")
    parser.add_argument("--days", type=int, default=90, help="Days to look back for backfill (default: 90)")
    args = parser.parse_args()
    
    if args.backfill_coords:
        backfill_coords(args.days)
        return
    
    print("🏗️  Starting Permit Velocity Track...")
    
    # Calculate "Last Week" (Ending last Sunday)
    today = datetime.now()
    idx = (today.weekday() + 1) % 7 
    last_sunday = today - timedelta(days=idx)
    
    print(f"📅 Analysis Week Ending: {last_sunday.date()}")
    
    # Analyze by Zip
    for zipcode in HILLS_ZIPS:
        # Current Week
        permits = fetch_weekly_permits(last_sunday)
        count = len(permits)
        
        # Calculate Average Valuation
        vals = []
        for p in permits:
            try:
                v = float(p.get("valuation", "0"))
                if v > 0: vals.append(v)
            except: pass
        
        avg_val = statistics.mean(vals) if vals else 0
        
        # Year ago (Approx)
        year_ago_date = last_sunday - timedelta(weeks=52)
        permits_ly = fetch_weekly_permits(year_ago_date)
        count_ly = len(permits_ly)
        
        yoy_change = None
        if count_ly > 0:
            yoy_change = ((count - count_ly) / count_ly) * 100
            
        print(f"   📍 {zipcode}: {count} permits (YoY: {round(yoy_change,1) if yoy_change else 'N/A'}%)")
        
        # Save Velocity
        save_velocity_to_db(last_sunday, zipcode, count, avg_val, yoy_change)
        
        # Save Recent Permits (Raw) with coordinates
        if permits:
            save_recents_to_db(permits)

if __name__ == "__main__":
    main()

