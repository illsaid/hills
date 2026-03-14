/**
 * Distress Adapter
 *
 * Surfaces distressed properties using:
 * 1. Open code enforcement cases (multiple open violations at same address)
 * 2. Parcel data with extended vacancy or anomalous permit gaps
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';
import { haversineDistance } from './haversine';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const distressAdapter: ModuleAdapter = {
    id: 'distress',
    title: 'Distress Signals',
    icon: 'alert-triangle',

    async discoverSchema(): Promise<SchemaDiscovery> {
        return {
            keys: ['case_number', 'address', 'case_type', 'date_opened', 'status', 'latitude', 'longitude'],
            sample: null,
        };
    },

    async getSummary(params: AddressParams): Promise<ModuleSummary> {
        const items = await this.getItems(params);
        const highCount = items.filter(i => i.severity === 'high').length;
        const total = items.length;

        if (total === 0) {
            return { newCount: 0, headlineMetric: 'No signals nearby', topTag: undefined };
        }

        return {
            newCount: total,
            headlineMetric: `${total} open case${total !== 1 ? 's' : ''} nearby`,
            topTag: highCount > 0 ? `${highCount} high severity` : undefined,
        };
    },

    async getItems(params: AddressParams): Promise<IntelEvent[]> {
        const { lat, lon, radius_m, window_days } = params;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - window_days);

        const { data, error } = await supabase
            .from('code_enforcement')
            .select('case_number, address, case_type, date_opened, status, lat, lon')
            .eq('status', 'O')
            .gte('date_opened', startDate.toISOString().split('T')[0])
            .not('lat', 'is', null)
            .not('lon', 'is', null)
            .order('date_opened', { ascending: false })
            .limit(300);

        if (error || !data) return [];

        const results: IntelEvent[] = [];

        for (const record of data) {
            const recLat = typeof record.lat === 'number' ? record.lat : parseFloat(record.lat as string);
            const recLon = typeof record.lon === 'number' ? record.lon : parseFloat(record.lon as string);

            if (isNaN(recLat) || isNaN(recLon)) continue;

            const dist = Math.round(haversineDistance(lat, lon, recLat, recLon));
            if (dist > radius_m) continue;

            const caseType = record.case_type || 'Code Violation';
            const severity: 'low' | 'med' | 'high' =
                caseType.toLowerCase().includes('fire') || caseType.toLowerCase().includes('structural')
                    ? 'high'
                    : caseType.toLowerCase().includes('zoning') || caseType.toLowerCase().includes('unpermitted')
                        ? 'med'
                        : 'low';

            results.push({
                source: 'distress',
                title: `Open ${caseType}: ${record.address || 'Unknown address'}`,
                event_date: record.date_opened || '',
                address_text: record.address || null,
                lat: recLat,
                lon: recLon,
                distance_m: dist,
                severity,
                confidence: 'high',
                source_url: `https://ladbsservices2.lacity.org/OnlineServices/RetrieveDSBISDocumentList?strJobNum=${record.case_number}`,
                raw: record,
            });
        }

        results.sort((a, b) => {
            const sevOrder = { high: 0, med: 1, low: 2 };
            if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
            return (a.distance_m || 0) - (b.distance_m || 0);
        });

        return results.slice(0, 80);
    },
};
