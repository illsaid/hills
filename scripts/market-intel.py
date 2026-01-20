#!/usr/bin/env python
"""
Market Intelligence - Measure ULA Analysis for Hollywood Hills
Uses Measure ULA Revenue Dataset (jqan-regh)

Tracks impact of "Mansion Tax" on real estate transactions in
Hollywood Hills zip codes (90046, 90068, 90069).
"""

import requests
import json
import os
from datetime import datetime, date
from collections import defaultdict

# Measure ULA Revenue Endpoint
API_ENDPOINT = "https://data.lacity.org/resource/jqan-regh.json"

# Target Zip Codes
HILLS_ZIPS = ["90046", "90068", "90069"]

MONTH_MAP = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
}

def parse_fiscal_date(month_str, fiscal_year_str):
    """
    Convert Fiscal Year/Month to Calendar Date.
    LA City Fiscal Year: July 1 to June 30.
    Values: July-Dec are (FY - 1), Jan-June are (FY).
    Example: FY 2024 July => July 2023. FY 2024 June => June 2024.
    """
    try:
        fy = int(fiscal_year_str)
        month_num = MONTH_MAP.get(month_str)
        
        if not month_num:
            return None
            
        # If month is July-Dec (7-12), it belongs to previous calendar year
        if month_num >= 7:
            year = fy - 1
        else:
            year = fy
            
        return date(year, month_num, 1)
        
    except (ValueError, TypeError):
        return None


def get_quarter(d):
    """Return Q1/Q2/Q3/Q4 string from date."""
    q = (d.month - 1) // 3 + 1
    return f"Q{q} {d.year}"


def fetch_data():
    """Fetch all Measure ULA data (dataset is small enough to fetch all)."""
    
    # Filter by our zip codes in query to save bandwidth
    # SoQL "IN" clause syntax: zip_code IN ('90046', '90068', '90069')
    zips_str = "'" + "', '".join(HILLS_ZIPS) + "'"
    where_clause = f"zip_code IN ({zips_str})"

    params = {
        "$where": where_clause,
        "$limit": 5000,
        "$$app_token": os.environ.get("LACITY_APP_TOKEN")
    }
    
    try:
        print("🔍 Querying Measure ULA dataset...")
        response = requests.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()
        print(f"   Retrieved {len(data)} transactions for Hills zips")
        return data
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️ API Error: {e}")
        return []


def analyze_quarters(transactions):
    """Aggregate transactions by calendar quarter."""
    quarters = defaultdict(lambda: {
        "count": 0,
        "revenue": 0.0,
        "prop_types": defaultdict(int),
        "tiers": defaultdict(int)
    })
    
    dates_in_quarter = defaultdict(list)
    
    for t in transactions:
        month = t.get("month")
        fy = t.get("fiscal_year")
        
        d = parse_fiscal_date(month, fy)
        if not d:
            continue
            
        q_key = get_quarter(d)
        dates_in_quarter[q_key].append(d)
        
        # Parse Revenue
        try:
            rev = float(t.get("revenue", "0"))
        except:
            rev = 0.0
            
        # Parse Tier
        tier = t.get("transaction_value", "Unknown")
        prop_type = t.get("property_use", "Unknown")
        
        quarters[q_key]["count"] += 1
        quarters[q_key]["revenue"] += rev
        quarters[q_key]["prop_types"][prop_type] += 1
        quarters[q_key]["tiers"][tier] += 1
        
    # Sort quarters
    sorted_quarters = []
    for q_key in quarters:
        # Sort key logic: "Q1 2024" -> (2024, 1)
        parts = q_key.split(" ")
        y = int(parts[1])
        q = int(parts[0][1])
        sorted_quarters.append(((y, q), q_key, quarters[q_key]))
        
    sorted_quarters.sort(reverse=True) # Newest first
    
    return sorted_quarters


def main():
    print("Starting Market Intelligence Analysis (Measure ULA)...")
    print("=" * 50)
    
    data = fetch_data()
    
    if not data:
        print("No data found.")
        return

    sorted_quarters = analyze_quarters(data)
    
    if not sorted_quarters:
        print("No valid quarters found.")
        return
        
    # Get most recent COMPLETED quarter?
    # Or just most recent quarter with data (which might be partial)
    # Let's take the most recent available quarter
    current_q_tuple, current_q_name, current_stats = sorted_quarters[0]
    
    # Previous quarter
    prev_stats = None
    if len(sorted_quarters) > 1:
        prev_stats = sorted_quarters[1][2]
        prev_q_name = sorted_quarters[1][1]

    # Year-Ago quarter (4 quarters back)
    year_ago_stats = None
    if len(sorted_quarters) > 4:
        # Check if 4th index is actually the same quarter last year
        # sorted_quarters[0] is current. [1] is prev. [4] is 4 quarters ago.
        # But we need to be careful if there are gaps. 
        # Let's verify the name matches (e.g. Q4 2025 vs Q4 2024)
        target_q_tuple = (current_q_tuple[0] - 1, current_q_tuple[1])
        
        for q_tuple, q_name, stats in sorted_quarters:
            if q_tuple == target_q_tuple:
                year_ago_stats = stats
                break
    
    # Calculate metrics
    total_rev = current_stats["revenue"]
    count = current_stats["count"]
    avg_tax = total_rev / count if count > 0 else 0
    
    # QoQ Change
    qoq_change_vol = 0
    if prev_stats and prev_stats["count"] > 0:
        qoq_change_vol = ((count - prev_stats["count"]) / prev_stats["count"]) * 100

    # YoY Change
    yoy_change_vol = 0
    yoy_available = False
    if year_ago_stats and year_ago_stats["count"] > 0:
        yoy_change_vol = ((count - year_ago_stats["count"]) / year_ago_stats["count"]) * 100
        yoy_available = True
        
    # Context Generation
    # Dominant property type
    top_prop = "Properties"
    if current_stats["prop_types"]:
        top_prop = max(current_stats["prop_types"], key=current_stats["prop_types"].get)
        
    # Build context string
    # "Volume down 57% vs Q3 2025. Down 41% vs Q4 2024."
    context = []
    
    # QoQ part
    if prev_stats:
        dir_qoq = "up" if qoq_change_vol >= 0 else "down"
        context.append(f"Volume {dir_qoq} {abs(int(qoq_change_vol))}% vs previous quarter.")
    
    # YoY part
    if yoy_available:
        dir_yoy = "up" if yoy_change_vol >= 0 else "down"
        context.append(f"{dir_yoy.title()} {abs(int(yoy_change_vol))}% vs same quarter last year.")
        
    # Property type part
    if count > 0 and top_prop != "Unknown":
        pca = int((current_stats["prop_types"][top_prop] / count) * 100)
        context.append(f"{pca}% of sales were {top_prop}.")

    # Strategic Context (Hardcoded based on user request/knowledge)
    # Only add if volume is down significantly (>30%)
    if qoq_change_vol < -30 or (yoy_available and yoy_change_vol < -30):
        context.append("Note: Transaction decline may reflect anticipation of 2026 ballot initiative to repeal ULA.")
    
    # Join nicely
    context_str = " ".join(context)
        
    output_data = {
        "quarter": current_q_name,
        "generated_revenue": total_rev,
        "transaction_count": count,
        "avg_tax": round(avg_tax, 2),
        "qoq_change_vol": round(qoq_change_vol, 1),
        "yoy_change_vol": round(yoy_change_vol, 1) if yoy_available else None,
        "top_sale_tier": max(current_stats["tiers"], key=current_stats["tiers"].get) if current_stats["tiers"] else "N/A",
        "context": context_str,
        "updated_at": datetime.now().isoformat(),
        "breakdown": {
            "tiers": dict(current_stats["tiers"]),
            "property_types": dict(current_stats["prop_types"])
        },
        "zips_analyzed": HILLS_ZIPS
    }
    
    # Save output
    output_path = os.path.join("data", "market_intel.json")
    os.makedirs("data", exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)
        
    print(f"\nAnalysis complete for {current_q_name}.")
    print(json.dumps(output_data, indent=2))


if __name__ == "__main__":
    main()
