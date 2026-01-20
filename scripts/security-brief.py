#!/usr/bin/env python
"""
Security Awareness Brief - Weekly Crime Analysis for Hollywood Hills
Uses LAPD NIBRS Offenses Dataset (y8y3-fqfu) - March 2024 to present

NIBRS (National Incident-Based Reporting System) provides more granular
crime data than the legacy UCR system. This script analyzes property crimes
in the Hollywood LAPD division area.

NOTE: NIBRS dataset does not include lat/lon coordinates, so we filter by
area_name = 'Hollywood' rather than geographic bounding box.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

# LAPD NIBRS API Endpoint (current data: March 2024 to present)
API_ENDPOINT = "https://data.lacity.org/resource/y8y3-fqfu.json"

# NIBRS started March 7, 2024 - no data before this
NIBRS_START_DATE = datetime(2024, 3, 7)

# NIBRS Property Crime Codes
# See: https://ucr.fbi.gov/nibrs/nibrs-user-manual
NIBRS_PROPERTY_CRIMES = {
    "Vehicle Security": {
        "codes": ["23F", "23G", "240"],  # Theft from MV, Theft of MV Parts, Motor Vehicle Theft
        "description": "Vehicle break-ins, theft from vehicles, motor vehicle theft"
    },
    "Residential Security": {
        "codes": ["220"],  # Burglary/Breaking & Entering
        "description": "Burglary, breaking and entering"
    },
    "Other Property": {
        "codes": ["23A", "23B", "23C", "23D", "23E", "23H", "26A", "26B", "26C", "26D", "26E", "290"],
        # Pocket-picking, Purse-snatching, Shoplifting, Theft from building, 
        # Theft from coin-op, All other larceny, Fraud variants, Vandalism
        "description": "Shoplifting, petty theft, vandalism, fraud"
    }
}

# Flatten codes for quick lookup
ALL_PROPERTY_CODES = []
for category in NIBRS_PROPERTY_CRIMES.values():
    ALL_PROPERTY_CODES.extend(category["codes"])


def get_crime_category(nibr_code):
    """Map NIBRS code to our security category."""
    for category, info in NIBRS_PROPERTY_CRIMES.items():
        if nibr_code in info["codes"]:
            return category
    return None


def fetch_crime_data(start_date, end_date):
    """Fetch crime data from LAPD NIBRS API for a given date range.
    
    Filters by:
    - area_name = 'Hollywood' (LAPD Hollywood Division)
    - crime_against = 'Property' (property crimes only)
    - Date range
    """
    
    # Format dates for SoQL query
    start_str = start_date.strftime("%Y-%m-%dT00:00:00.000")
    end_str = end_date.strftime("%Y-%m-%dT23:59:59.999")
    
    # NIBRS query: Hollywood division, property crimes
    where_clause = (
        f"date_occ >= '{start_str}' AND date_occ <= '{end_str}' AND "
        "area_name = 'Hollywood' AND crime_against = 'Property'"
    )

    params = {
        "$where": where_clause,
        "$limit": 2000,
        "$order": "date_occ DESC",
        "$$app_token": os.environ.get("LACITY_APP_TOKEN")
    }
    
    try:
        print(f"   Querying: {start_date.date()} to {end_date.date()}")
        response = requests.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"   Retrieved {len(data)} raw incidents")
        return data
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️ API Error: {e}")
        return []


def analyze_week(incidents):
    """Analyze a week of incidents by category.
    
    Note: NIBRS does not have lat/lon, so we cannot do micro-zone analysis.
    Instead, we group by crime category.
    """
    type_counts = defaultdict(int)
    total_count = 0
    relevant_incidents = []

    for incident in incidents:
        try:
            nibr_code = incident.get("nibr_code", "")
            
            # Get our category
            category = get_crime_category(nibr_code)
            if not category:
                # It's a property crime but not in our focus categories
                # Still count it in Other Property
                category = "Other Property"
            
            type_counts[category] += 1
            total_count += 1
            
            incident["crime_category"] = category
            relevant_incidents.append(incident)
            
        except (ValueError, TypeError):
            continue
            
    return {
        "type_counts": dict(type_counts),
        "total": total_count,
        "incidents": relevant_incidents
    }


def check_clustering(incidents):
    """Check for temporal clustering (3+ similar incidents within 72h).
    
    Since NIBRS lacks location data, we group by crime category instead of zone.
    """
    seen_clusters = set()
    clusters = []
    
    # Sort by date
    try:
        incidents.sort(key=lambda x: x.get("date_occ", ""))
    except:
        return []
    
    for i in range(len(incidents)):
        current = incidents[i]
        crime_type = current.get("crime_category", "Unknown")
        
        if crime_type in seen_clusters:
            continue
            
        matches = [current]
        
        try:
            current_date = datetime.fromisoformat(current["date_occ"].replace(".000", ""))
        except:
            continue
            
        for j in range(i + 1, len(incidents)):
            candidate = incidents[j]
            
            try:
                candidate_date = datetime.fromisoformat(candidate["date_occ"].replace(".000", ""))
            except:
                continue
            
            diff_hours = (candidate_date - current_date).total_seconds() / 3600
            
            if diff_hours > 72:
                break
                
            if candidate.get("crime_category") == crime_type:
                matches.append(candidate)
        
        if len(matches) >= 3:
            seen_clusters.add(crime_type)
            clusters.append({
                "type": crime_type,
                "count": len(matches)
            })
                
    return clusters


def generate_brief(current_analysis, prev_analysis, year_ago_analysis, clusters, analysis_period, run_date, data_lag_days):
    """Generate the text brief with date context and incident breakdown."""
    
    curr_total = current_analysis["total"]
    prev_total = prev_analysis["total"]
    year_total = year_ago_analysis["total"]
    
    # Calculate trends
    wow_change = 0
    if prev_total > 0:
        wow_change = ((curr_total - prev_total) / prev_total) * 100
        
    yoy_change = 0
    yoy_available = year_total > 0
    if yoy_available:
        yoy_change = ((curr_total - year_total) / year_total) * 100
        
    # Determine Status
    status = "NORMAL"
    status_color = "green"
    
    if wow_change > 30 and curr_total >= 5:
        status = "ELEVATED"
        status_color = "amber"
        status_detail = f"Activity {int(abs(wow_change))}% above average"
    elif wow_change < -15:
        status_detail = f"Activity {int(abs(wow_change))}% below average"
    elif abs(wow_change) <= 15:
        status_detail = "Activity within normal range"
    else:
        status_detail = f"Activity {int(abs(wow_change))}% {'above' if wow_change > 0 else 'below'} average"
        
    # Brief Generation
    lines = []
    
    # Header with date context
    start_date, end_date = analysis_period
    lines.append(f"**SECURITY BRIEF — Week of {start_date.strftime('%b %d')}–{end_date.strftime('%b %d')}**")
    lines.append(f"*(Data updated {run_date.strftime('%b %d')} — typical {data_lag_days}-day reporting delay)*")
    lines.append("")
    
    # Status line
    lines.append(f"**Status:** {status} — {status_detail}")
    lines.append(f"{curr_total} property incidents in Hollywood Division this week.")
    
    # NIBRS note (if counts seem high)
    if curr_total > 50:
        lines.append("*(NIBRS counts each offense separately; counts may appear higher than legacy reports)*")
    
    # Incident Type Breakdown
    if curr_total > 0:
        lines.append("")
        lines.append("**Incident Breakdown:**")
        type_counts = current_analysis.get("type_counts", {})
        for crime_type in ["Vehicle Security", "Residential Security", "Other Property"]:
            count = type_counts.get(crime_type, 0)
            if count > 0:
                pct = int((count / curr_total) * 100)
                lines.append(f"• {crime_type}: {count} incidents ({pct}%)")
    
    # Year-over-year context
    lines.append("")
    if yoy_available:
        yoy_dir = "above" if yoy_change > 0 else "below"
        lines.append(f"Tracking {abs(int(yoy_change))}% {yoy_dir} same week last year ({curr_total} vs {year_total}).")
    else:
        lines.append("*Year-over-year comparison not available (NIBRS data starts March 2024)*")
    
    # Notable patterns
    if clusters:
        cluster_parts = [f"{c['type']} ({c['count']} in 72h)" for c in clusters]
        lines.append(f"Patterns detected: {'; '.join(cluster_parts)}.")
        
    return {
        "status": status,
        "status_detail": status_detail,
        "color": status_color,
        "analysis_week": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "data_as_of": run_date.strftime("%Y-%m-%d"),
        "data_source": "LAPD NIBRS (y8y3-fqfu)",
        "brief_text": "\n".join(lines),
        "updated_at": datetime.now().isoformat(),
        "stats": {
            "total": curr_total,
            "wow_change": round(wow_change, 1),
            "yoy_change": round(yoy_change, 1) if yoy_available else None,
            "yoy_available": yoy_available,
            "type_breakdown": current_analysis.get("type_counts", {})
        }
    }


def main():
    print("Starting Security Brief Analysis (NIBRS)...")
    print("=" * 50)
    
    # LAPD data typically lags 14-21 days
    DATA_LAG_DAYS = int(os.environ.get("DATA_LAG_DAYS", "21"))
    
    # Date handling
    ref_date_str = os.environ.get("REFERENCE_DATE")
    if ref_date_str:
        today = datetime.fromisoformat(ref_date_str)
        print(f"⚠️ Using Reference Date: {today.date()} (Simulation Mode)")
    else:
        today = datetime.now()
        print(f"📅 Run Date: {today.date()}")
        
    # Account for data lag
    effective_today = today - timedelta(days=DATA_LAG_DAYS)
    print(f"📊 Data Lag Offset: {DATA_LAG_DAYS} days (analyzing data as of {effective_today.date()})")
    
    # Find most recent complete week (ending Saturday)
    days_since_saturday = (effective_today.weekday() + 2) % 7
    end_current = effective_today - timedelta(days=days_since_saturday)
    start_current = end_current - timedelta(days=6)
    
    # Check if we're before NIBRS start
    if end_current < NIBRS_START_DATE:
        print(f"⚠️ Analysis period ({end_current.date()}) is before NIBRS data starts ({NIBRS_START_DATE.date()})")
        print("   No data available for this period.")
        return
    
    # Previous week
    end_prev = start_current - timedelta(days=1)
    start_prev = end_prev - timedelta(days=6)
    
    # Same week last year (may not have data if before NIBRS start)
    end_year = end_current - timedelta(days=365)
    start_year = end_year - timedelta(days=6)
    
    print(f"\n📆 Analysis Period: {start_current.date()} to {end_current.date()}")
    
    # Fetch Data
    print("\n🔍 Fetching current week...")
    current_data = fetch_crime_data(start_current, end_current)
    
    print("\n🔍 Fetching previous week...")
    prev_data = fetch_crime_data(start_prev, end_prev)
    
    print("\n🔍 Fetching year-ago week...")
    if start_year >= NIBRS_START_DATE:
        year_data = fetch_crime_data(start_year, end_year)
    else:
        print(f"   ⏭️ Skipped (before NIBRS start date)")
        year_data = []
    
    print(f"\nFetched {len(current_data)} incidents for current week.")
    
    # Analyze
    curr_analysis = analyze_week(current_data)
    prev_analysis = analyze_week(prev_data)
    year_analysis = analyze_week(year_data)
    
    print(f"Mapped {curr_analysis['total']} relevant property crimes.")
    
    # Clusters
    clusters = check_clustering(curr_analysis["incidents"])
    
    # Generate Brief
    analysis_period = (start_current, end_current)
    brief_data = generate_brief(
        curr_analysis, prev_analysis, year_analysis, clusters,
        analysis_period=analysis_period,
        run_date=today,
        data_lag_days=DATA_LAG_DAYS
    )
    
    # Output
    output_path = os.path.join("data", "security_brief.json")
    os.makedirs("data", exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(brief_data, f, indent=2)
        
    print("\nBrief generated successfully.")
    print(json.dumps(brief_data, indent=2))


if __name__ == "__main__":
    main()
