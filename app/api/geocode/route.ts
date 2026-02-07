/**
 * Geocoding API Route
 * 
 * Server-side route for Google Places (New) Autocomplete and Geocoding.
 * Keeps Google API key server-side for security.
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Google Places (New) API endpoints
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places';

interface AutocompleteResult {
    placePrediction?: {
        placeId: string;
        text: { text: string };
        structuredFormat?: {
            mainText: { text: string };
            secondaryText?: { text: string };
        };
    };
}

// Autocomplete endpoint - returns address suggestions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const input = searchParams.get('input');
        const action = searchParams.get('action') || 'autocomplete';

        if (!GOOGLE_API_KEY) {
            return NextResponse.json(
                { error: 'Google Maps API key not configured' },
                { status: 500 }
            );
        }

        if (action === 'autocomplete') {
            if (!input || input.length < 3) {
                return NextResponse.json({ predictions: [] });
            }

            // Use Google Places (New) Autocomplete API
            const response = await fetch(AUTOCOMPLETE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                },
                body: JSON.stringify({
                    input,
                    includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
                    includedRegionCodes: ['us'],
                    locationBias: {
                        circle: {
                            center: { latitude: 34.1, longitude: -118.34 }, // Hollywood Hills center
                            radius: 20000.0, // 20km radius bias
                        },
                    },
                }),
            });

            const data = await response.json();

            if (data.error) {
                console.error('[geocode] Google API error:', data.error);
                return NextResponse.json(
                    { error: `Google API error: ${data.error.message || data.error.status}` },
                    { status: 500 }
                );
            }

            const predictions = (data.suggestions || []).map((s: AutocompleteResult) => {
                const place = s.placePrediction;
                if (!place) return null;
                return {
                    placeId: place.placeId,
                    description: place.text?.text || '',
                    mainText: place.structuredFormat?.mainText?.text || place.text?.text || '',
                    secondaryText: place.structuredFormat?.secondaryText?.text || '',
                };
            }).filter(Boolean);

            return NextResponse.json({ predictions });
        }

        if (action === 'details') {
            const placeId = searchParams.get('placeId');
            if (!placeId) {
                return NextResponse.json({ error: 'placeId required' }, { status: 400 });
            }

            // Get place details including geometry using Places (New) API
            const response = await fetch(`${DETAILS_URL}/${placeId}?fields=formattedAddress,location`, {
                headers: {
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                },
            });

            const data = await response.json();

            if (data.error) {
                console.error('[geocode] Details error:', data.error);
                return NextResponse.json(
                    { error: `Google API error: ${data.error.message || data.error.status}` },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                address: data.formattedAddress || '',
                placeId,
                lat: data.location?.latitude,
                lon: data.location?.longitude,
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


