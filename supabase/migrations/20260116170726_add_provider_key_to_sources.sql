/*
  # Add provider_key column to sources table

  ## Changes
  1. Adds `provider_key` column to sources table
     - Used for reliable provider dispatch instead of name matching
     - Values: 'nws', 'lafd', 'ladbs'
  
  2. Creates index on provider_key + area_id for fast lookups

  ## Security
  - No RLS changes needed (existing policies cover this column)
*/

-- Add provider_key column
ALTER TABLE sources ADD COLUMN IF NOT EXISTS provider_key text;

-- Create index for fast provider lookups
CREATE INDEX IF NOT EXISTS idx_sources_provider_area ON sources(provider_key, area_id);

-- Update existing sources with provider_key based on name
UPDATE sources SET provider_key = 'nws' WHERE name ILIKE '%nws%' OR name ILIKE '%weather%';
UPDATE sources SET provider_key = 'lafd' WHERE name ILIKE '%lafd%';
UPDATE sources SET provider_key = 'ladbs' WHERE name ILIKE '%ladbs%' OR name ILIKE '%permit%';