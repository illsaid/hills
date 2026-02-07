# FireScore Data

This directory contains data for the FireScore module, specifically Fire Hazard Severity Zones (FHSZ).

## Data Source
Download the FHSZ data from CAL FIRE or LA County GIS Data Portal.
Format: GeoJSON (WGS84 / EPSG:4326 preferred).

**Recommended Source:**
[CAL FIRE FHSZ Viewer Data](https://egis.fire.ca.gov/FHSZ/)

## Ingestion
1. Place the GeoJSON file here, e.g., `fhsz.geojson`.
2. Run the ingestion script:

```bash
# Truncate and reload
python scripts/firescore-ingest.py --file data/firescore/fhsz.geojson --truncate
```

## Verification
The ingestion script converts the GeoJSON geometry into PostGIS `GEOGRAPHY` type in the `fire_zones` table.
Zone classes are normalized to `VERY_HIGH`, `HIGH`, or `OTHER`.
