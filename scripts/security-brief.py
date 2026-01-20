
import requests
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict
import math

# LAPD Crime Data API Endpoint
API_ENDPOINT = "https://data.lacity.org/resource/2nrs-mtv8.json"

# Micro-Zones Definitions (resident-recognizable neighborhoods)
ZONES = {
    "Lower Laurel Canyon": {"lat_min": 34.090, "lat_max": 34.105, "lon_min": -118.38, "lon_max": -118.35},
    "Upper Laurel Canyon": {"lat_min": 34.105, "lat_max": 34.125, "lon_min": -118.38, "lon_max": -118.35},
    "Mulholland Corridor": {"lat_min": 34.115, "lat_max": 34.140, "lon_min": -118.42, "lon_max": -118.35},
    "Runyon Canyon Area": {"lat_min": 34.105, "lat_max": 34.120, "lon_min": -118.35, "lon_max": -118.32},
    "Beachwood Canyon": {"lat_min": 34.105, "lat_max": 34.125, "lon_min": -118.32, "lon_max": -118.28},
    "Nichols Canyon": {"lat_min": 34.095, "lat_max": 34.115, "lon_min": -118.36, "lon_max": -118.33}
}

# Crime Codes grouping (for incident type breakdown)
# Categories: Vehicle Security, Residential Security, Other Property
PROPERTY_CRIMES = {
    "Vehicle Security": ["330", "331", "410", "420", "421", "480", "485"],  # Vehicle break-ins, theft from vehicle
    "Residential Security": ["310", "320", "440", "441", "442", "443", "444", "445"],  # Burglary, residential theft
    "Other Property": ["341", "343", "345", "350", "351", "352", "353", "450", "451", "452", "453", "470", "471", "472", "473", "474", "475", "740", "745"]  # Other theft, vandalism
}

def get_zone(lat, lon):
    """Identify which micro-zone a coordinate belongs to."""
    for zone, bounds in ZONES.items():
        if (bounds["lat_min"] <= lat <= bounds["lat_max"] and
            bounds["lon_min"] <= lon <= bounds["lon_max"]):
            return zone
    return None

def fetch_crime_data(start_date, end_date):
    """Fetch crime data from LAPD API for a given date range.
    
    Uses lat/long bounding box for Hollywood Hills area.
    Note: Dataset doesn't have zip_code field, uses area_name + coordinates.
    """
    
    # Format dates for SoQL query
    start_str = start_date.strftime("%Y-%m-%dT00:00:00.000")
    end_str = end_date.strftime("%Y-%m-%dT23:59:59.999")
    
    # Hollywood Hills bounding box (covers 90068, 90046, 90069 areas)
    # area_name includes: Hollywood, Wilshire, West LA divisions
    where_clause = (
        f"date_occ >= '{start_str}' AND date_occ <= '{end_str}' AND "
        "lat >= 34.090 AND lat <= 34.140 AND "
        "lon >= -118.42 AND lon <= -118.28"
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
    """Analyze a week of incidents by zone and type."""
    stats = defaultdict(lambda: defaultdict(int))
    zone_counts = defaultdict(int)
    type_counts = defaultdict(int)  # Track incident types for breakdown
    total_count = 0
    
    relevant_incidents = []

    for incident in incidents:
        try:
            # Parse lat/lon
            if "lat" not in incident or "lon" not in incident:
                continue
                
            lat = float(incident["lat"])
            lon = float(incident["lon"])
            
            # Check zone
            zone = get_zone(lat, lon)
            if not zone:
                continue
            
            # Check crime type
            cc = incident.get("crm_cd", "")
            crime_type = None
            
            for c_type, codes in PROPERTY_CRIMES.items():
                if cc in codes:
                    crime_type = c_type
                    break
            
            if not crime_type:
                continue
                
            stats[zone][crime_type] += 1
            zone_counts[zone] += 1
            type_counts[crime_type] += 1  # Count by type
            total_count += 1
            
            incident["zone"] = zone
            incident["crime_type"] = crime_type
            relevant_incidents.append(incident)
            
        except (ValueError, TypeError):
            continue
            
    return {
        "stats": stats,
        "zone_counts": dict(zone_counts),
        "type_counts": dict(type_counts),  # Include type breakdown
        "total": total_count,
        "incidents": relevant_incidents
    }

def check_clustering(incidents):
    """Check for temporal clustering (3+ similar incidents in same zone within 72h)."""
    clusters = []
    # Sort by date
    incidents.sort(key=lambda x: x["date_occ"])
    
    for i in range(len(incidents)):
        current = incidents[i]
        zone_matches = [current]
        
        # Look ahead
        for j in range(i + 1, len(incidents)):
            candidate = incidents[j]
            
            # Check time diff (parsed from string)
            # API format: 2024-01-15T00:00:00.000
            current_date = datetime.fromisoformat(current["date_occ"])
            candidate_date = datetime.fromisoformat(candidate["date_occ"])
            
            diff = (candidate_date - current_date).total_seconds() / 3600
            
            if diff > 72: # More than 72 hours apart
                break
                
            if candidate["zone"] == current["zone"] and candidate["crime_type"] == current["crime_type"]:
                zone_matches.append(candidate)
        
        if len(zone_matches) >= 3:
            # Avoid duplicate reporting of same cluster
            # Simple check: if we haven't reported this type/zone recently
            already_reported = any(c["zone"] == current["zone"] and c["type"] == current["crime_type"] for c in clusters)
            if not already_reported:
                clusters.append({
                    "zone": current["zone"],
                    "type": current["crime_type"],
                    "count": len(zone_matches),
                    "days": 3
                })
                
    return clusters

def generate_brief(current_analysis, prev_analysis, year_ago_analysis, clusters, analysis_period, run_date, data_lag_days):
    """Generate the text brief with date context and incident breakdown."""
    
    # Calculate trends
    curr_total = current_analysis["total"]
    prev_total = prev_analysis["total"]
    year_total = year_ago_analysis["total"]
    
    wow_change = 0
    if prev_total > 0:
        wow_change = ((curr_total - prev_total) / prev_total) * 100
        
    yoy_change = 0
    if year_total > 0:
        yoy_change = ((curr_total - year_total) / year_total) * 100
        
    # Determine Status with clearer language
    status = "NORMAL"
    status_color = "green"
    status_detail = ""
    
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
    
    # Status line with precision
    lines.append(f"**Status:** {status} — {status_detail}")
    lines.append(f"{curr_total} property incidents mapped across Hollywood Hills neighborhoods.")
    
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
    if year_total > 0:
        yoy_dir = "above" if yoy_change > 0 else "below"
        lines.append(f"Tracking {abs(int(yoy_change))}% {yoy_dir} same week last year ({curr_total} vs {year_total}).")
    
    # Zone Focus
    most_active_zone = max(current_analysis["zone_counts"], key=current_analysis["zone_counts"].get, default=None)
    if most_active_zone and current_analysis["zone_counts"].get(most_active_zone, 0) > 0:
        most_active_count = current_analysis["zone_counts"][most_active_zone]
        lines.append(f"**Area of Note:** {most_active_zone} ({most_active_count} incidents).")
    
    # Notable clusters
    if clusters:
        cluster_texts = []
        for c in clusters:
            cluster_texts.append(f"{c['type'].lower()} activity in {c['zone']}")
        lines.append(f"Patterns detected: {'; '.join(cluster_texts)}.")
        
    return {
        "status": status,
        "status_detail": status_detail,
        "color": status_color,
        "analysis_week": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "data_as_of": run_date.strftime("%Y-%m-%d"),
        "brief_text": "\n".join(lines),
        "updated_at": datetime.now().isoformat(),
        "stats": {
            "total": curr_total,
            "wow_change": round(wow_change, 1),
            "yoy_change": round(yoy_change, 1),
            "type_breakdown": current_analysis.get("type_counts", {})
        }
    }

def main():
    print("Starting Security Brief Analysis...")
    print("=" * 50)
    
    # LAPD data typically lags 7-14 days behind real-time
    DATA_LAG_DAYS = int(os.environ.get("DATA_LAG_DAYS", "14"))
    
    # Date ranges
    ref_date_str = os.environ.get("REFERENCE_DATE")
    if ref_date_str:
        today = datetime.fromisoformat(ref_date_str)
        print(f"⚠️ Using Reference Date: {today.date()} (Simulation Mode)")
    else:
        today = datetime.now()
        print(f"📅 Run Date: {today.date()}")
        
    # Account for LAPD reporting lag
    # "Current week" = the most recent complete week with reliable data
    effective_today = today - timedelta(days=DATA_LAG_DAYS)
    print(f"📊 Data Lag Offset: {DATA_LAG_DAYS} days (analyzing data as of {effective_today.date()})")
    
    # End of the analysis period (Saturday before effective_today)
    # Find the most recent Saturday
    days_since_saturday = (effective_today.weekday() + 2) % 7  # Saturday = 5, so +2 mod 7
    end_current = effective_today - timedelta(days=days_since_saturday)
    start_current = end_current - timedelta(days=6)
    
    # Previous week
    end_prev = start_current - timedelta(days=1)
    start_prev = end_prev - timedelta(days=6)
    
    # Same week last year
    end_year = end_current - timedelta(days=365)
    start_year = end_year - timedelta(days=6)
    
    print(f"\n📆 Analysis Period: {start_current.date()} to {end_current.date()}")
    
    # Fetch Data
    current_data = fetch_crime_data(start_current, end_current)
    prev_data = fetch_crime_data(start_prev, end_prev)
    year_data = fetch_crime_data(start_year, end_year)
    
    print(f"Fetched {len(current_data)} incidents for current week.")
    
    # Analyze
    curr_analysis = analyze_week(current_data)
    prev_analysis = analyze_week(prev_data)
    year_analysis = analyze_week(year_data)
    
    print(f"Mapped {curr_analysis['total']} relevant property crimes in zones.")
    
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
        
    print("Brief generated successfully.")
    print(json.dumps(brief_data, indent=2))

if __name__ == "__main__":
    main()
