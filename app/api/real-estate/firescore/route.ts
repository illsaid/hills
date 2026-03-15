/**
 * Real Estate BuildWatch API Route
 * 
 * Server-side route that queries Supabase cache and returns normalized IntelEvents.
 * This reads from the recent_inspections table (NOT Socrata directly).
 */

import { NextRequest, NextResponse } from 'next/server';
import { firescoreAdapter } from '@/lib/real-estate/firescoreAdapter';
import type { AddressParams } from '@/lib/real-estate/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const lat = parseFloat(searchParams.get('lat') || '');
        const lon = parseFloat(searchParams.get('lon') || '');
        // Radius/Window not strictly used for point-in-polygon but kept for interface consistency
        const radius_m = parseInt(searchParams.get('radius_m') || '500', 10);
        const window_days = parseInt(searchParams.get('window_days') || '90', 10);

        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json(
                { error: 'Missing required params: lat, lon' },
                { status: 400 }
            );
        }

        const params: AddressParams = { lat, lon, radius_m, window_days };

        const [items, summary] = await Promise.all([
            firescoreAdapter.getItems(params),
            firescoreAdapter.getSummary(params),
        ]);

        return NextResponse.json({
            items,
            summary,
            params,
            cached_at: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[/api/real-estate/firescore] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch firescore data' },
            { status: 500 }
        );
    }
}
