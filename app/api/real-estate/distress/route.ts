import { NextRequest, NextResponse } from 'next/server';
import { distressAdapter } from '@/lib/real-estate/distressAdapter';
import type { AddressParams } from '@/lib/real-estate/types';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

function getCacheKey(params: AddressParams): string {
    return `distress:${params.lat},${params.lon},${params.radius_m},${params.window_days}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const lat = parseFloat(searchParams.get('lat') || '');
        const lon = parseFloat(searchParams.get('lon') || '');
        const radius_m = parseInt(searchParams.get('radius_m') || '2000', 10);
        const window_days = parseInt(searchParams.get('window_days') || '365', 10);

        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json({ error: 'Missing required params: lat, lon' }, { status: 400 });
        }

        const params: AddressParams = { lat, lon, radius_m, window_days };
        const cacheKey = getCacheKey(params);

        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return NextResponse.json(cached.data);
        }

        const [items, summary] = await Promise.all([
            distressAdapter.getItems(params),
            distressAdapter.getSummary(params),
        ]);

        const response = { items, summary, params, cached_at: new Date().toISOString() };
        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        return NextResponse.json(response);
    } catch (error) {
        console.error('[/api/real-estate/distress] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch distress data' }, { status: 500 });
    }
}
