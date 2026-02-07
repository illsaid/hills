-- FireScore Zones Migration
-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create fire_zones table for FHSZ polygons
CREATE TABLE IF NOT EXISTS fire_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,  -- e.g. 'CALFIRE_FHSZ'
    zone_class TEXT NOT NULL,  -- Normalized: 'VERY_HIGH', 'HIGH', 'OTHER'
    
    -- Geometry column: MultiPolygon in WGS84 (4326)
    geom GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    raw JSONB
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_fire_zones_geom ON fire_zones USING GIST (geom);

-- Index for zone class
CREATE INDEX IF NOT EXISTS idx_fire_zones_class ON fire_zones (zone_class);

-- Grant access
ALTER TABLE fire_zones ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (public data)
CREATE POLICY "Public read access" ON fire_zones FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access" ON fire_zones USING (true) WITH CHECK (true);
