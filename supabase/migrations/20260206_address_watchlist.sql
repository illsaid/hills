-- Address Watchlist Tables for Real Estate Intelligence
-- Migration: 20260206_address_watchlist.sql

-- watch_addresses: stores user's saved addresses for property intel
CREATE TABLE IF NOT EXISTS watch_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT,
  address_text TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_addresses_user_id ON watch_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_addresses_user_created ON watch_addresses(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE watch_addresses ENABLE ROW LEVEL SECURITY;

-- Separate policies for each operation with WITH CHECK for INSERT/UPDATE
CREATE POLICY "select_own_watch_addresses" ON watch_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_watch_addresses" ON watch_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_watch_addresses" ON watch_addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_watch_addresses" ON watch_addresses
  FOR DELETE USING (auth.uid() = user_id);


-- user_prefs: stores user's default address and query preferences
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id UUID PRIMARY KEY,
  default_watch_address_id UUID REFERENCES watch_addresses(id) ON DELETE SET NULL,
  default_radius_m INT DEFAULT 500,
  default_window_days INT DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;

-- Separate policies for each operation
CREATE POLICY "select_own_user_prefs" ON user_prefs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_user_prefs" ON user_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_user_prefs" ON user_prefs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
