-- BuildWatch Inspections Migration
-- Creates recent_inspections table for LADBS Building & Safety Inspections cache

-- Main table
CREATE TABLE IF NOT EXISTS recent_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'ladbs_inspections',
    source_row_id TEXT UNIQUE NOT NULL,  -- Socrata :id or synthesized hash
    
    -- Core fields
    permit TEXT,
    address_text TEXT,
    inspection_type TEXT,
    inspection_result TEXT,  -- Raw result text
    permit_status TEXT,
    inspection_date TIMESTAMPTZ,
    
    -- Location
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    location JSONB,  -- Raw lat_lon object for debugging
    
    -- Computed classification
    result_class TEXT NOT NULL DEFAULT 'neutral',  -- pass | fail | neutral
    is_failure BOOLEAN NOT NULL DEFAULT FALSE,
    severity TEXT NOT NULL DEFAULT 'low',  -- low | med | high
    
    -- Storage
    raw JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_recent_inspections_date 
    ON recent_inspections (inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_recent_inspections_coords 
    ON recent_inspections (lat, lon);

CREATE INDEX IF NOT EXISTS idx_recent_inspections_failure 
    ON recent_inspections (is_failure, inspection_date DESC);

CREATE INDEX IF NOT EXISTS idx_recent_inspections_result_class 
    ON recent_inspections (result_class);

-- Unique constraint on source_row_id for upserts
-- (already handled by UNIQUE in column definition)

-- Comment: RLS is disabled for this cache table (public read, service role write)
