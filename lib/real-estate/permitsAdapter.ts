/**
 * Permits Adapter for LA City Building Permits
 * 
 * Uses Supabase 'recent_permits' cache (populated by GitHub Actions workflow).
 * Applies haversine distance filtering client-side.
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';
import { haversineDistance } from './haversine';

// Supabase client for server-side queries
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Keywords for severity classification
 */
const HIGH_SEVERITY_KEYWORDS = ['DEMO', 'DEMOLITION', 'GRADING', 'HAUL', 'RETAINING', 'FOUNDATION', 'EXCAVAT'];
const MED_SEVERITY_KEYWORDS = ['ADU', 'ADDITION', 'REMODEL', 'POOL', 'GUEST', 'ACCESSORY'];

/**
 * Determine severity based on work description keywords
 */
function classifySeverity(desc: string): 'low' | 'med' | 'high' {
    const upper = (desc || '').toUpperCase();

    if (HIGH_SEVERITY_KEYWORDS.some(kw => upper.includes(kw))) {
        return 'high';
    }
    if (MED_SEVERITY_KEYWORDS.some(kw => upper.includes(kw))) {
        return 'med';
    }
    return 'low';
}

/**
 * Transform a permit record into an IntelEvent
 */
function transformRecord(
    record: Record<string, unknown>,
    centerLat: number,
    centerLon: number
): IntelEvent & { distance_m: number } {
    const lat = record.lat ? parseFloat(record.lat as string) : null;
    const lon = record.lon ? parseFloat(record.lon as string) : null;
    const desc = (record.description as string) || '';

    // Compute distance if coordinates available
    let distance_m = Infinity;
    if (lat !== null && lon !== null) {
        distance_m = Math.round(haversineDistance(centerLat, centerLon, lat, lon));
    }

    // Build title from description
    const title = desc.length > 60 ? desc.substring(0, 57) + '...' : desc;

    return {
        source: 'permits',
        title: title || 'Building Permit',
        event_date: (record.issue_date as string) || '',
        address_text: (record.address as string) || null,
        lat,
        lon,
        distance_m,
        severity: classifySeverity(desc),
        confidence: 'high',
        source_url: (record.zimas_url as string) || `https://ladbs.org/permits/${record.permit_number}`,
        raw: record,
    };
}

export const permitsAdapter: ModuleAdapter = {
    id: 'permits',
    title: 'Building Permits',
    icon: 'file-text',

    async discoverSchema(): Promise<SchemaDiscovery> {
        // Not applicable for Supabase cache
        return { keys: ['permit_number', 'address', 'zip_code', 'permit_type', 'description', 'issue_date', 'status', 'valuation', 'lat', 'lon'], sample: null };
    },

    async getSummary(params: AddressParams): Promise<ModuleSummary> {
        const items = await this.getItems(params);
        const highCount = items.filter(i => i.severity === 'high').length;

        return {
            newCount: items.length,
            headlineMetric: `${items.length} permits (${params.window_days}d) within ${params.radius_m}m`,
            topTag: highCount > 0 ? `${highCount} high-impact` : undefined,
        };
    },

    async getItems(params: AddressParams): Promise<IntelEvent[]> {
        const { lat, lon, radius_m, window_days } = params;

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Calculate start date
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - window_days);
        const startDateISO = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Fetch recent permits from Supabase cache
        // Only fetch permits with valid coordinates (filter out coords_missing)
        const { data, error } = await supabase
            .from('recent_permits')
            .select('*')
            .gte('issue_date', startDateISO)
            .not('lat', 'is', null)
            .not('lon', 'is', null)
            .order('issue_date', { ascending: false })
            .limit(500);

        if (error) {
            console.error('[permitsAdapter] Supabase error:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('[permitsAdapter] No permits found in cache');
            return [];
        }

        // Transform all records and compute distances where possible
        const transformed = data.map(record => transformRecord(record, lat, lon));

        // Filter to those within radius (only those with valid coords)
        // Records without coords are excluded from radius filtering but could be shown in "all" view
        const withinRadius = transformed.filter(item => item.distance_m <= radius_m);

        // Sort by distance, with unknown distances at the end
        withinRadius.sort((a, b) => {
            if (a.distance_m === Infinity) return 1;
            if (b.distance_m === Infinity) return -1;
            return a.distance_m - b.distance_m;
        });

        console.log(`[permitsAdapter] Found ${withinRadius.length} permits within ${radius_m}m (from ${data.length} total, ${data.filter(r => r.lat && r.lon).length} with coords)`);

        return withinRadius.slice(0, 100);
    },
};
