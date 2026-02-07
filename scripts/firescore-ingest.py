#!/usr/bin/env python
"""
FireScore Ingestion Script
Ingests Fire Hazard Severity Zones (FHSZ) from local GeoJSON/Shapefile into Supabase.

Usage:
  python firescore-ingest.py --file data/firescore/fhsz.geojson --truncate
"""

import os
import json
import argparse
import psycopg2
from psycopg2.extras import execute_values
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    load_dotenv()
except ImportError:
    pass

# Supabase Connection
DB_URL = os.environ.get("DATABASE_URL")  # Direct Postgres connection required for PostGIS insert

# Zone Class Normalization
def normalize_zone(zone_str):
    if not zone_str:
        return 'OTHER'
    z = zone_str.upper()
    if 'VERY HIGH' in z:
        return 'VERY_HIGH'
    if 'HIGH' in z:
        return 'HIGH'
    if 'MODERATE' in z:
        return 'OTHER'
    return 'OTHER'

def main():
    parser = argparse.ArgumentParser(description="FireScore Ingestion")
    parser.add_argument("--file", required=True, help="Path to GeoJSON file")
    parser.add_argument("--truncate", action="store_true", help="Truncate table before ingestion")
    args = parser.parse_args()

    if not DB_URL:
        print("❌ Missing DATABASE_URL env var")
        return

    print(f"🔥 FireScore Ingestion: {args.file}")

    try:
        with open(args.file, 'r') as f:
            data = json.load(f)
        
        features = data.get('features', [])
        print(f"📦 Loaded {len(features)} features from GeoJSON")
        
        # Prepare rows
        rows = []
        for feat in features:
            props = feat.get('properties', {})
            geom = feat.get('geometry')
            
            # Extract zone class (adjust key based on actual dataset, usually 'HAZ_CLASS' or similar)
            # CALFIRE Example: 'HAZ_CLASS' -> 'Very High', 'High', 'Moderate'
            zone_raw = props.get('HAZ_CLASS') or props.get('SRA_HAZ_CLASS') or props.get('LRA_HAZ_CLASS') or 'Unknown'
            zone_class = normalize_zone(zone_raw)
            
            # Convert geometry to WKT or keep as GeoJSON string for ST_GeomFromGeoJSON
            geom_json = json.dumps(geom)
            
            rows.append((
                'CALFIRE_FHSZ',
                zone_class,
                geom_json,
                json.dumps(props)
            ))
            
        print(f"🔄 Preparing to insert {len(rows)} zones...")

        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        if args.truncate:
            print("🧹 Truncating fire_zones table...")
            cur.execute("TRUNCATE TABLE fire_zones;")

        # Insert query using ST_GeomFromGeoJSON
        # CAST to GEOGRAPHY(MULTIPOLYGON, 4326)
        query = """
            INSERT INTO fire_zones (source, zone_class, geom, raw)
            VALUES %s
        """
        
        # Transform value list for execute_values
        # We need to wrap the geometry in ST_GeomFromGeoJSON(...) sql function
        # But execute_values is for literal values. 
        # Better approach: 
        # INSERT INTO fire_zones (source, zone_class, geom, raw) 
        # VALUES ('src', 'cls', ST_Multi(ST_GeomFromGeoJSON('...')), 'raw')
        
        # Actually, simpler to use logic in loop if not too massive, or construct complex query.
        # Let's use executemany with a direct query string
        
        insert_sql = """
            INSERT INTO fire_zones (source, zone_class, geom, raw)
            VALUES (%s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))::geography, %s)
        """
        
        cur.executemany(insert_sql, rows)
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Ingestion complete: {len(rows)} zones inserted")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
