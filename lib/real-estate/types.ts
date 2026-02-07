/**
 * Types for Real Estate Intelligence Module Adapters
 * 
 * IMPORTANT: Only adapter files may reference upstream API field names.
 * UI components must only use IntelEvent and never access raw field names.
 */

/**
 * Normalized event type that the UI depends on.
 * All adapters must transform their data into this shape.
 */
export interface IntelEvent {
    /** Source adapter identifier */
    source: 'permits' | 'buildwatch' | 'distress' | 'insuretrack' | string;

    /** Human-readable event title */
    title: string;

    /** ISO date string of when the event occurred */
    event_date: string;

    /** Street address if available */
    address_text: string | null;

    /** Latitude if geocoded */
    lat: number | null;

    /** Longitude if geocoded */
    lon: number | null;

    /** Distance from query origin in meters (computed) */
    distance_m: number | null;

    /** Severity classification */
    severity: 'low' | 'med' | 'high';

    /** Confidence in the data quality */
    confidence: 'low' | 'med' | 'high';

    /** Link to source data if available */
    source_url: string | null;

    /** Full upstream record verbatim (for debugging/details) */
    raw: unknown;
}

/**
 * Parameters for address-scoped queries
 */
export interface AddressParams {
    lat: number;
    lon: number;
    radius_m: number;
    window_days: number;
}

/**
 * Summary returned by adapters for tile display
 */
export interface ModuleSummary {
    newCount: number;
    headlineMetric: string;
    topTag?: string;
}

/**
 * Schema discovery result for debugging/development
 */
export interface SchemaDiscovery {
    keys: string[];
    sample: unknown;
}

/**
 * Adapter interface that all feed modules must implement.
 * 
 * RULE: discoverSchema() must run a sample request and log keys.
 * RULE: Only the adapter may reference upstream field names.
 */
export interface ModuleAdapter {
    /** Unique adapter identifier */
    id: string;

    /** Human-readable module title */
    title: string;

    /** Icon name for display */
    icon?: string;

    /**
     * Discover the schema of the upstream data source.
     * Must fetch a single record and return the keys found.
     */
    discoverSchema(sampleParams?: unknown): Promise<SchemaDiscovery>;

    /**
     * Get a summary for the module tile (count, headline, top tag).
     */
    getSummary(params: AddressParams): Promise<ModuleSummary>;

    /**
     * Get normalized events for the given address context.
     */
    getItems(params: AddressParams): Promise<IntelEvent[]>;
}
