/**
 * BuildWatch Adapter for LADBS Building & Safety Inspections
 * 
 * Queries Supabase 'recent_inspections' cache (NOT Socrata directly).
 * Applies haversine distance filtering.
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';
import { haversineDistance } from './haversine';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Transform an inspection record into an IntelEvent
 */
function transformRecord(
    record: Record<string, unknown>,
    centerLat: number,
    centerLon: number
): IntelEvent & { distance_m: number; is_failure: boolean } {
    const lat = record.lat ? parseFloat(record.lat as string) : null;
    const lon = record.lon ? parseFloat(record.lon as string) : null;

    // Compute distance
    let distance_m = Infinity;
    if (lat !== null && lon !== null) {
        distance_m = Math.round(haversineDistance(centerLat, centerLon, lat, lon));
    }

    const resultClass = (record.result_class as string) || 'neutral';
    const isFail = record.is_failure === true;
    const inspectionType = (record.inspection_type as string) || 'Inspection';
    const result = (record.inspection_result as string) || '';

    // Build title based on result
    let title: string;
    if (isFail) {
        title = `Failed: ${inspectionType}`;
    } else if (resultClass === 'pass') {
        title = `Passed: ${inspectionType}`;
    } else {
        title = `${inspectionType}: ${result}`.substring(0, 60);
    }

    return {
        source: 'buildwatch',
        title,
        event_date: (record.inspection_date as string) || '',
        address_text: (record.address_text as string) || null,
        lat,
        lon,
        distance_m,
        severity: (record.severity as 'low' | 'med' | 'high') || 'low',
        confidence: 'med',
        // Link to LA City Open Data portal for the inspection dataset
        // (LADBS ladbsservices URLs don't support direct permit lookups)
        source_url: 'https://data.lacity.org/City-Infrastructure-Service-Requests/Building-and-Safety-Inspections/9w5z-rg2h',
        raw: record,
        is_failure: isFail,
    };
}

export const buildwatchAdapter: ModuleAdapter = {
    id: 'buildwatch',
    title: 'BuildWatch',
    icon: 'alert-triangle',

    async discoverSchema(): Promise<SchemaDiscovery> {
        return {
            keys: ['source_row_id', 'permit', 'address_text', 'inspection_type', 'inspection_result',
                'inspection_date', 'lat', 'lon', 'result_class', 'is_failure', 'severity'],
            sample: null
        };
    },

    async getSummary(params: AddressParams): Promise<ModuleSummary> {
        const items = await this.getItems(params);
        // Count failures using the pre-computed is_failure from cache table
        // (set during ingestion based on result_class, NOT re-parsed here)
        const failCount = items.filter(i => (i as any).is_failure === true).length;
        const totalCount = items.length;

        return {
            newCount: failCount,
            headlineMetric: `${failCount} fails / ${totalCount} inspections`,
            topTag: failCount > 0 ? `${failCount} failures` : undefined,
        };
    },

    async getItems(params: AddressParams): Promise<IntelEvent[]> {
        const { lat, lon, radius_m, window_days } = params;

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Calculate start date
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - window_days);
        const startDateISO = startDate.toISOString();

        // Query from Supabase cache ONLY (not Socrata)
        // Filter: lat/lon NOT NULL for radius filtering
        const { data, error } = await supabase
            .from('recent_inspections')
            .select('*')
            .gte('inspection_date', startDateISO)
            .not('lat', 'is', null)
            .not('lon', 'is', null)
            .order('inspection_date', { ascending: false })
            .limit(500);

        if (error) {
            console.error('[buildwatchAdapter] Supabase error:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('[buildwatchAdapter] No inspections found in cache');
            return [];
        }

        // Transform and filter by distance
        const transformed = data.map(record => transformRecord(record, lat, lon));

        // Filter to those within radius
        const withinRadius = transformed.filter(item => item.distance_m <= radius_m);

        // Sort: failures first, then by date (newest first)
        withinRadius.sort((a, b) => {
            // Failures first
            if (a.is_failure && !b.is_failure) return -1;
            if (!a.is_failure && b.is_failure) return 1;
            return 0;
        });

        console.log(`[buildwatchAdapter] Found ${withinRadius.length} inspections within ${radius_m}m (${withinRadius.filter(i => i.is_failure).length} failures)`);

        return withinRadius.slice(0, 100);
    },
};
