/*
  # Add is_seed column to events table

  ## Changes
  1. Adds `is_seed` boolean column to events table
     - Defaults to false for new records
     - Used to distinguish seeded/test data from live ingested data
  
  2. Marks all existing events as seed data
     - Sets is_seed=true for all current records

  ## Security
  - No RLS changes needed (existing policies cover this column)
*/

-- Add is_seed column with default false
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_seed boolean DEFAULT false NOT NULL;

-- Mark all existing events as seed data
UPDATE events SET is_seed = true WHERE is_seed = false;

-- Create index for filtering queries
CREATE INDEX IF NOT EXISTS idx_events_is_seed ON events(is_seed);