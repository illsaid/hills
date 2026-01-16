export type EventType = 'FIRE' | 'FIRE_WEATHER' | 'WEATHER' | 'CLOSURE' | 'PURSUIT' | 'CRIME' | 'PERMIT' | 'OTHER';
export type EventLevel = 'INFO' | 'ADVISORY' | 'CRITICAL';
export type EventVerification = 'VERIFIED' | 'SINGLE_SOURCE' | 'UNVERIFIED';
export type SourceType = 'rss' | 'html' | 'pdf' | 'api' | 'socrata';
export type IngestStatus = 'RUNNING' | 'SUCCESS' | 'ERROR';

export interface Area {
  id: string;
  slug: string;
  name: string;
  zips: string[];
  bbox_min_lat: number;
  bbox_max_lat: number;
  bbox_min_lng: number;
  bbox_max_lng: number;
  created_at: string;
}

export interface Source {
  id: string;
  area_id: string;
  name: string;
  source_type: SourceType;
  url: string;
  reliability: number;
  active: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  area_id: string;
  source_id: string | null;
  event_type: EventType;
  level: EventLevel;
  verification: EventVerification;
  impact: number;
  confidence_basis: string | null;
  title: string;
  summary: string;
  location_label: string;
  lat: number | null;
  lng: number | null;
  occurred_at: string | null;
  observed_at: string;
  source_url: string | null;
  created_at: string;
}

export interface EventWithSource extends Event {
  source: Source | null;
}

export interface Project {
  id: string;
  area_id: string;
  title: string;
  location_label: string;
  status: string;
  last_activity_at: string;
  dossier: string;
  created_at: string;
}

export interface IngestRun {
  id: string;
  area_id: string;
  source_id: string | null;
  provider: string;
  started_at: string;
  finished_at: string | null;
  status: IngestStatus;
  items_fetched: number;
  items_inserted: number;
  error: string | null;
}
