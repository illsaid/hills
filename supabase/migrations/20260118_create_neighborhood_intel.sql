-- Create neighborhood_intel table for modular data ingestion
CREATE TABLE IF NOT EXISTS neighborhood_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE,  -- UNIQUE constraint for deduplication via upsert
    category TEXT NOT NULL DEFAULT 'News',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_category ON neighborhood_intel(category);
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_published ON neighborhood_intel(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_source ON neighborhood_intel(source_name);

-- Enable Row Level Security (optional, can be configured later)
-- ALTER TABLE neighborhood_intel ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE neighborhood_intel IS 'Standardized table for scraped neighborhood intel from various sources';
COMMENT ON COLUMN neighborhood_intel.source_name IS 'Name of the data source (e.g., CD4 News, HHWNC)';
COMMENT ON COLUMN neighborhood_intel.url IS 'Unique URL for deduplication via upsert';
COMMENT ON COLUMN neighborhood_intel.category IS 'Auto-categorized: Safety, Traffic, Housing, Tourism, News';
