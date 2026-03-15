import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'autocomplete';

        if (action === 'autocomplete') {
            const input = searchParams.get('input');
            if (!input || input.length < 3) {
                return NextResponse.json({ predictions: [] });
            }

            const url = new URL(NOMINATIM_URL);
            url.searchParams.set('q', input);
            url.searchParams.set('format', 'jsonv2');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('limit', '5');
            url.searchParams.set('countrycodes', 'us');
            url.searchParams.set('viewbox', '-118.55,34.0,-118.15,34.2');
            url.searchParams.set('bounded', '0');

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'HillsLedger/1.0',
                },
            });

            if (!response.ok) {
                return NextResponse.json(
                    { error: 'Geocoding service unavailable' },
                    { status: 502 }
                );
            }

            const results = await response.json();

            const predictions = results.map((r: {
                place_id: number;
                display_name: string;
                lat: string;
                lon: string;
                address?: {
                    house_number?: string;
                    road?: string;
                    city?: string;
                    state?: string;
                };
            }) => {
                const addr = r.address;
                const mainText = addr
                    ? [addr.house_number, addr.road].filter(Boolean).join(' ') || r.display_name.split(',')[0]
                    : r.display_name.split(',')[0];
                const secondaryText = addr
                    ? [addr.city, addr.state].filter(Boolean).join(', ')
                    : r.display_name.split(',').slice(1).join(',').trim();

                return {
                    placeId: String(r.place_id),
                    description: r.display_name,
                    mainText,
                    secondaryText,
                    lat: parseFloat(r.lat),
                    lon: parseFloat(r.lon),
                };
            });

            return NextResponse.json({ predictions });
        }

        if (action === 'details') {
            const placeId = searchParams.get('placeId');
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');
            const addr = searchParams.get('address');

            if (!placeId) {
                return NextResponse.json({ error: 'placeId required' }, { status: 400 });
            }

            return NextResponse.json({
                address: addr || '',
                placeId,
                lat: lat ? parseFloat(lat) : null,
                lon: lon ? parseFloat(lon) : null,
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[geocode] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process geocode request' },
            { status: 500 }
        );
    }
}
