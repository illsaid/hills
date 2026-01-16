import { EventType, EventLevel, EventVerification } from '../types/database';

export interface IngestionEvent {
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
  occurred_at: Date | null;
  observed_at: Date;
  source_url: string | null;
}

export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export interface IngestionContext {
  areaId: string;
  sourceId: string;
  bbox: BoundingBox;
  keywords: string[];
}

export interface IngestionResult {
  fetched: number;
  inserted: number;
  error?: string;
}

export interface Provider {
  name: string;
  ingest(context: IngestionContext): Promise<IngestionResult>;
}
