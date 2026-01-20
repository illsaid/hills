-- Add priority and incident_id columns to neighborhood_intel for safety dispatch
ALTER TABLE neighborhood_intel 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS incident_id TEXT;

-- Create unique index on incident_id for deduplication (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_intel_incident_id 
ON neighborhood_intel(incident_id) WHERE incident_id IS NOT NULL;

-- Add index on priority for efficient queries
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_priority 
ON neighborhood_intel(priority);

COMMENT ON COLUMN neighborhood_intel.priority IS 'Priority level: 1=Critical (Red), 2=High (Orange), 3=Medium (Yellow)';
COMMENT ON COLUMN neighborhood_intel.incident_id IS 'Unique incident ID for deduplication (e.g., lafd-12345-90068)';
