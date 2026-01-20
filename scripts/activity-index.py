#!/usr/bin/env python
"""
Community Activity Index - Weekly Analysis of LAPD Calls for Service
Uses LAPD Calls for Service Dataset (xjgu-z4ju) - 2024 to present

Analyzes dispatch calls in Hollywood Division to provide early warning
signals that complement the crime-based Security Brief.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

# LAPD Calls for Service API
API_ENDPOINT = "https://data.lacity.org/resource/xjgu-z4ju.json"

# Data starts in 2024
DATA_START_DATE = datetime(2024, 1, 1)

# Call type categories for security-relevant analysis
# Codes based on LAPD radio codes
CALL_CATEGORIES = {
    "Alarm Responses": {
        "codes": ["906"],
        "keywords": ["ALARM", "RINGER", "459 SILENT"],
        "description": "Burglar alarms, silent alarms"
    },
    "Burglary Related": {
        "codes": ["459"],
        "keywords": ["459", "BFV", "BFMV", "HOTPROWL"],
        "description": "Burglary in progress, from vehicle, hot prowl"
    },
    "Trespass": {
        "codes": ["921"],
        "keywords": ["921", "TRESPASS"],
        "description": "Trespassing, unwanted persons"
    },
    "Theft": {
        "codes": ["484", "503"],
        "keywords": ["484", "503", "GTA", "THEFT"],
        "description": "Petty theft, grand theft auto"
    },
    "Vandalism": {
        "codes": ["594"],
        "keywords": ["594", "VANDAL"],
        "description": "Vandalism, property damage"
    },
    "Suspicious Activity": {
        "codes": ["146"],
        "keywords": ["146", "SUSP PERS", "SUSPICIOUS"],
        "description": "Suspicious person, vehicle, or circumstances"
    }
}

# Codes to EXCLUDE (noise)
EXCLUDED_CODES = ["006", "902", "415", "620", "507", "907", "314", "242", "245", "207"]


def load_hills_rds():
    """Load the list of Hollywood Hills Reporting Districts."""
    try:
        path = os.path.join("data", "hills_rds.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
    except Exception as e:
        print(f"⚠️ Failed to load Hills RDs: {e}")
    return None


def categorize_call(call_type_text, call_type_code):
    """Categorize a call based on its type code and text."""
    # Check exclusions first
    code_prefix = call_type_code[:3] if call_type_code else ""
    if code_prefix in EXCLUDED_CODES:
        return None
    
    # Match to categories
    for category, info in CALL_CATEGORIES.items():
        # Check code prefix
        if code_prefix in info["codes"]:
            return category
        # Check keywords in text
        text_upper = call_type_text.upper() if call_type_text else ""
        if any(kw in text_upper for kw in info["keywords"]):
            return category
    
    return None


def fetch_calls(start_date, end_date):
    """Fetch calls for service from LAPD API for a given date range."""
    
    start_str = start_date.strftime("%Y-%m-%dT00:00:00.000")
    end_str = end_date.strftime("%Y-%m-%dT23:59:59.999")
    
    where_clause = (
        f"dispatch_date >= '{start_str}' AND dispatch_date <= '{end_str}' AND "
        "area_occ = 'Hollywood'"
    )
    
    params = {
        "$where": where_clause,
        "$limit": 5000,
        "$order": "dispatch_date DESC",
        "$$app_token": os.environ.get("LACITY_APP_TOKEN")
    }
    
    try:
        print(f"   Querying: {start_date.date()} to {end_date.date()}")
        response = requests.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"   Retrieved {len(data)} raw calls")
        
        # Filter by RD if provided
        # Note: API limitation prevents simple "IN (...)" query for many RDs, 
        # so we filter client-side for precision
        hills_rds = load_hills_rds()
        if hills_rds:
            filtered_data = [d for d in data if d.get("rpt_dist") in hills_rds]
            print(f"   Filtered to {len(filtered_data)} calls in Hills RDs")
            return filtered_data
            
        return data
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️ API Error: {e}")
        return []


def analyze_calls(calls):
    """Analyze calls and categorize them."""
    category_counts = defaultdict(int)
    total_relevant = 0
    categorized_calls = []
    
    for call in calls:
        call_type_text = call.get("call_type_text", "")
        call_type_code = call.get("call_type_code", "")
        
        category = categorize_call(call_type_text, call_type_code)
        if category:
            category_counts[category] += 1
            total_relevant += 1
            call["category"] = category
            categorized_calls.append(call)
    
    return {
        "category_counts": dict(category_counts),
        "total": total_relevant,
        "calls": categorized_calls
    }


def calculate_baseline(today):
    """Calculate historical baseline from past 8 weeks of data."""
    weeks_data = []
    
    for weeks_ago in range(2, 10):  # Skip most recent 2 weeks (data lag), use weeks 2-9
        end = today - timedelta(weeks=weeks_ago)
        start = end - timedelta(days=6)
        
        if start < DATA_START_DATE:
            break
            
        calls = fetch_calls(start, end)
        analysis = analyze_calls(calls)
        weeks_data.append(analysis["total"])
    
    if weeks_data:
        return sum(weeks_data) / len(weeks_data)
    return 0


def generate_activity_brief(current_analysis, prev_analysis, baseline, analysis_period, run_date, data_lag_days):
    """Generate the activity index output."""
    
    curr_total = current_analysis["total"]
    prev_total = prev_analysis["total"]
    
    # Week over week change
    wow_change = 0
    if prev_total > 0:
        wow_change = ((curr_total - prev_total) / prev_total) * 100
    
    # Vs baseline
    vs_baseline = 0
    if baseline > 0:
        vs_baseline = ((curr_total - baseline) / baseline) * 100
    
    # Determine status
    if vs_baseline < -20:
        status = "QUIET"
        status_color = "blue"
    elif vs_baseline > 20:
        status = "ELEVATED"
        status_color = "amber"
    else:
        status = "NORMAL"
        status_color = "green"
    
    # Build context note
    start_date, end_date = analysis_period
    category_counts = current_analysis.get("category_counts", {})
    
    # Find dominant category
    top_category = None
    top_count = 0
    for cat, count in category_counts.items():
        if count > top_count:
            top_count = count
            top_category = cat
    
    if top_category and curr_total > 0:
        pct = int((top_count / curr_total) * 100)
        context = f"{top_category} accounts for {pct}% of calls."
    else:
        context = "Insufficient data for pattern analysis."
    
    # Build brief text
    lines = []
    lines.append(f"**ACTIVITY INDEX — Week of {start_date.strftime('%b %d')}–{end_date.strftime('%b %d')}**")
    lines.append(f"*(Data updated {run_date.strftime('%b %d')} — typical {data_lag_days}-day lag)*")
    lines.append("")
    lines.append(f"**Status:** {status} — {curr_total} security-related calls in Hollywood Division")
    
    if curr_total > 0:
        lines.append("")
        lines.append("**Call Breakdown:**")
        for cat in ["Alarm Responses", "Burglary Related", "Trespass", "Theft", "Vandalism", "Suspicious Activity"]:
            count = category_counts.get(cat, 0)
            if count > 0:
                pct = int((count / curr_total) * 100)
                lines.append(f"• {cat}: {count} calls ({pct}%)")
    
    if baseline > 0:
        lines.append("")
        direction = "above" if vs_baseline > 0 else "below"
        lines.append(f"Tracking {abs(int(vs_baseline))}% {direction} 8-week average ({curr_total} vs {int(baseline)}).")
    
    return {
        "activity_status": status,
        "status_color": status_color,
        "total_calls": curr_total,
        "wow_change": round(wow_change, 1),
        "vs_baseline": round(vs_baseline, 1),
        "baseline_avg": round(baseline, 1),
        "call_breakdown": category_counts,
        "context": context,
        "brief_text": "\n".join(lines),
        "analysis_week": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        "data_as_of": run_date.strftime("%Y-%m-%d"),
        "data_source": "LAPD Calls for Service (xjgu-z4ju)",
        "updated_at": datetime.now().isoformat()
    }


def main():
    print("Starting Activity Index Analysis...")
    print("=" * 50)
    
    # Data lag (calls for service may have shorter lag than crime reports)
    DATA_LAG_DAYS = int(os.environ.get("DATA_LAG_DAYS", "14"))
    
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
    
    # Previous week
    end_prev = start_current - timedelta(days=1)
    start_prev = end_prev - timedelta(days=6)
    
    print(f"\n📆 Analysis Period: {start_current.date()} to {end_current.date()}")
    
    # Fetch current and previous week
    print("\n🔍 Fetching current week...")
    current_data = fetch_calls(start_current, end_current)
    
    print("\n🔍 Fetching previous week...")
    prev_data = fetch_calls(start_prev, end_prev)
    
    # Analyze
    curr_analysis = analyze_calls(current_data)
    prev_analysis = analyze_calls(prev_data)
    
    print(f"\nCategorized {curr_analysis['total']} security-relevant calls from {len(current_data)} total.")
    
    # Calculate baseline (cached or computed)
    print("\n📈 Calculating 8-week baseline...")
    baseline = calculate_baseline(today)
    print(f"   Baseline average: {baseline:.1f} calls/week")
    
    # Generate output
    analysis_period = (start_current, end_current)
    activity_data = generate_activity_brief(
        curr_analysis, prev_analysis, baseline,
        analysis_period=analysis_period,
        run_date=today,
        data_lag_days=DATA_LAG_DAYS
    )
    
    # Save output
    output_path = os.path.join("data", "activity_index.json")
    os.makedirs("data", exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(activity_data, f, indent=2)
    
    print("\nActivity Index generated successfully.")
    print(json.dumps(activity_data, indent=2))


if __name__ == "__main__":
    main()
