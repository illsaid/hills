-- Permit Coordinates Migration
-- Run this in Supabase SQL Editor

-- Add lat/lon columns
ALTER TABLE recent_permits
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

-- Create spatial index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recent_permits_lat_lon
  ON recent_permits (lat, lon);

-- Track missing coordinates
ALTER TABLE recent_permits
  ADD COLUMN IF NOT EXISTS coords_missing BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_recent_permits_coords_missing
  ON recent_permits (coords_missing);
