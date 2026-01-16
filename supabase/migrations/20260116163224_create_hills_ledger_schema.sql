/*
  # The Hills Ledger - Database Schema

  ## Overview
  Creates the complete database schema for The Hills Ledger application, a terminal-style
  event monitoring and reporting system for the Hollywood Hills area.

  ## Tables Created

  1. **areas** - Geographic regions monitored by the system
     - `id` (uuid, primary key) - Unique identifier
     - `slug` (text, unique) - URL-friendly identifier (e.g., 'hollywood-hills')
     - `name` (text) - Display name
     - `zips` (text[]) - Array of ZIP codes in the area
     - `bbox_min_lat`, `bbox_max_lat`, `bbox_min_lng`, `bbox_max_lng` (double precision) - Bounding box coordinates
     - `created_at` (timestamptz) - Creation timestamp

  2. **sources** - Data sources for event ingestion
     - `id` (uuid, primary key) - Unique identifier
     - `area_id` (uuid, foreign key) - References areas(id)
     - `name` (text) - Source display name
     - `source_type` (text) - Type: rss, html, pdf, api, socrata
     - `url` (text) - Source URL
     - `reliability` (integer) - Reliability score 1-5
     - `active` (boolean) - Whether source is currently active
     - `created_at` (timestamptz) - Creation timestamp

  3. **ingest_runs** - Tracking for ingestion pipeline executions
     - `id` (uuid, primary key) - Unique identifier
     - `area_id` (uuid, foreign key) - References areas(id)
     - `source_id` (uuid, foreign key, nullable) - References sources(id)
     - `provider` (text) - Provider name (lafd, nws, ladbs)
     - `started_at` (timestamptz) - When ingestion started
     - `finished_at` (timestamptz, nullable) - When ingestion completed
     - `status` (text) - Status: RUNNING, SUCCESS, ERROR
     - `items_fetched` (integer) - Number of items retrieved
     - `items_inserted` (integer) - Number of new items inserted
     - `error` (text, nullable) - Error message if failed

  4. **events** - Core event records from various sources
     - `id` (uuid, primary key) - Unique identifier
     - `area_id` (uuid, foreign key) - References areas(id)
     - `source_id` (uuid, foreign key, nullable) - References sources(id)
     - `event_type` (text) - FIRE, WEATHER, CLOSURE, PURSUIT, CRIME, PERMIT, OTHER
     - `level` (text) - INFO, ADVISORY, CRITICAL
     - `verification` (text) - VERIFIED, SINGLE_SOURCE, UNVERIFIED
     - `impact` (integer) - Impact score 0-5
     - `confidence_basis` (text, nullable) - Explanation of relevance/verification
     - `title` (text) - Event title
     - `summary` (text) - Event description
     - `location_label` (text) - Coarse location description (no exact addresses)
     - `lat`, `lng` (double precision, nullable) - Coordinates
     - `occurred_at` (timestamptz, nullable) - When event occurred
     - `observed_at` (timestamptz) - When event was observed/recorded
     - `source_url` (text, nullable) - Link to original source
     - `created_at` (timestamptz) - Creation timestamp

  5. **projects** - Development and permit projects
     - `id` (uuid, primary key) - Unique identifier
     - `area_id` (uuid, foreign key) - References areas(id)
     - `title` (text) - Project title
     - `location_label` (text) - Coarse location description
     - `status` (text) - Project status (e.g., 'Under Review', 'Approved')
     - `last_activity_at` (timestamptz) - Last activity date
     - `dossier` (text) - Multi-paragraph project description
     - `created_at` (timestamptz) - Creation timestamp

  6. **watchlists** - User watchlist terms (future premium feature)
     - `id` (uuid, primary key) - Unique identifier
     - `user_id` (uuid, nullable) - Future user reference
     - `area_id` (uuid, foreign key) - References areas(id)
     - `term` (text) - Search term
     - `created_at` (timestamptz) - Creation timestamp

  ## Indexes Created
  - events(area_id, observed_at DESC) - For efficient area-based event queries
  - events(area_id, event_type, observed_at DESC) - For filtered event type queries
  - projects(area_id, last_activity_at DESC) - For recent project queries
  - ingest_runs(area_id, started_at DESC) - For tracking ingestion history by area
  - ingest_runs(source_id, started_at DESC) - For tracking ingestion history by source

  ## Security
  - RLS is enabled on all tables
  - Public read access policies for non-sensitive data
  - No authentication required for v0 (decision-support tool)
*/

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  zips text[] NOT NULL,
  bbox_min_lat double precision NOT NULL,
  bbox_max_lat double precision NOT NULL,
  bbox_min_lng double precision NOT NULL,
  bbox_max_lng double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL,
  url text NOT NULL,
  reliability integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create ingest_runs table
CREATE TABLE IF NOT EXISTS ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  provider text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'RUNNING',
  items_fetched integer NOT NULL DEFAULT 0,
  items_inserted integer NOT NULL DEFAULT 0,
  error text
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sources(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  level text NOT NULL DEFAULT 'INFO',
  verification text NOT NULL DEFAULT 'SINGLE_SOURCE',
  impact integer NOT NULL DEFAULT 1,
  confidence_basis text,
  title text NOT NULL,
  summary text NOT NULL,
  location_label text NOT NULL,
  lat double precision,
  lng double precision,
  occurred_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source_url text,
  created_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  title text NOT NULL,
  location_label text NOT NULL,
  status text NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  dossier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create watchlists table (future premium feature)
CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  term text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_area_observed ON events(area_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_area_type_observed ON events(area_id, event_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_area_activity ON projects(area_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_area_started ON ingest_runs(area_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_source_started ON ingest_runs(source_id, started_at DESC);

-- Enable Row Level Security
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for v0)
CREATE POLICY "Public read access to areas"
  ON areas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to sources"
  ON sources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to ingest_runs"
  ON ingest_runs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to watchlists"
  ON watchlists FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can insert/update for ingestion
CREATE POLICY "Service role can insert events"
  ON events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert ingest_runs"
  ON ingest_runs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update ingest_runs"
  ON ingest_runs FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert areas"
  ON areas FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert sources"
  ON sources FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert projects"
  ON projects FOR INSERT
  TO service_role
  WITH CHECK (true);