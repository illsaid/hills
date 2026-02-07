/**
 * Real Estate Permits API Route
 * 
 * Server-side route that queries Socrata and returns normalized IntelEvents.
 * This keeps Socrata calls on the server to avoid CORS/rate limit issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { permitsAdapter } from '@/lib/real-estate/permitsAdapter';
import type { AddressParams } from '@/lib/real-estate/types';

// Simple in-memory cache (60 seconds)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

function getCacheKey(params: AddressParams): string {
    return `${params.lat},${params.lon},${params.radius_m},${params.window_days}`;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const lat = parseFloat(searchParams.get('lat') || '');
        const lon = parseFloat(searchParams.get('lon') || '');
        const radius_m = parseInt(searchParams.get('radius_m') || '500', 10);
        const window_days = parseInt(searchParams.get('window_days') || '30', 10);

        // Validate required params
        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json(
                { error: 'Missing required params: lat, lon' },
                { status: 400 }
            );
        }

        const params: AddressParams = { lat, lon, radius_m, window_days };
        const cacheKey = getCacheKey(params);

        // Check cache
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return NextResponse.json(cached.data);
        }

        // Fetch from adapter
        const [items, summary] = await Promise.all([
            permitsAdapter.getItems(params),
            permitsAdapter.getSummary(params),
        ]);

        const response = {
            items,
            summary,
            params,
            cached_at: new Date().toISOString(),
        };

        // Update cache
        cache.set(cacheKey, { data: response, timestamp: Date.now() });

        return NextResponse.json(response);
    } catch (error) {
        console.error('[/api/real-estate/permits] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch permits data' },
            { status: 500 }
        );
    }
}

// POST for schema discovery (dev tool)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.action === 'discover') {
            const schema = await permitsAdapter.discoverSchema();
            return NextResponse.json(schema);
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[/api/real-estate/permits] POST Error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
