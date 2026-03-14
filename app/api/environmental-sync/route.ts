import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Configuration
const TARGET_ZIPS = [
    { zip: '90068', lat: 34.1164, lng: -118.3205 }, // Hollywood Hills
    { zip: '90046', lat: 34.1010, lng: -118.3620 }, // Laurel Canyon
    { zip: '90069', lat: 34.0906, lng: -118.3842 }, // Sunset Strip
];

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const AQI_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

interface AQIResult {
    zip: string;
    aqi: number;
    pollutant: string;
    category: string;
    health_recommendation: string;
}

/**
 * Fetch AQI from Google API
 */
async function fetchAQI(lat: number, lng: number): Promise<any> {
    if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_MAPS_API_KEY');

    const response = await fetch(`${AQI_API_URL}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: { latitude: lat, longitude: lng },
            extraComputations: ['DOMINANT_POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS']
        })
    });

    if (!response.ok) throw new Error(`AQI API Error: ${response.status}`);
    return await response.json();
}


export async function GET() {
    try {
        const { data, error } = await supabaseServer
            .from('neighborhood_intel')
            .select('metadata, created_at')
            .eq('source_name', 'Google AQI')
            .not('metadata', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ avg_aqi: 78, category: 'Moderate', updated_at: null });
        }

        const meta = data.metadata as Record<string, unknown>;
        return NextResponse.json({
            avg_aqi: meta?.avg_aqi ?? 78,
            locations: meta?.locations ?? [],
            spike_detected: meta?.spike_detected ?? false,
            updated_at: data.created_at,
        });
    } catch (err) {
        console.error('[environmental-sync GET]', err);
        return NextResponse.json({ avg_aqi: 78, updated_at: null });
    }
}

export async function POST() {
    try {
        if (!GOOGLE_API_KEY) {
            return NextResponse.json({ success: false, error: 'Missing API Config' }, { status: 500 });
        }

        const results: AQIResult[] = [];
        let spikeDetected = false;

        // 1. Fetch current conditions for all zips
        for (const loc of TARGET_ZIPS) {
            const data = await fetchAQI(loc.lat, loc.lng);
            const index = data.indexes?.find((i: any) => i.code === 'uaqi') || data.indexes?.[0];
            const pollutant = data.pollutants?.find((p: any) => p.code === index?.dominantPollutant);

            results.push({
                zip: loc.zip,
                aqi: index?.aqi || 0,
                pollutant: index?.dominantPollutant || 'Unknown',
                category: index?.category || 'Unknown',
                health_recommendation: data.healthRecommendations?.generalPopulation || ''
            });
        }

        // 2. Fetch previous reading to check for Smoke Spike
        const { data: lastReading } = await supabaseServer
            .from('neighborhood_intel')
            .select('metadata, created_at')
            .eq('source_name', 'Google AQI')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let priority = 3;
        let alertTitle = 'Air Quality Update';

        // Calculate average AQI for the cluster
        const avgAQI = Math.round(results.reduce((acc, curr) => acc + curr.aqi, 0) / results.length);
        const dominantPollutant = results[0].pollutant; // Simplification for cluster

        // Check for 20% spike if we have previous data
        if (lastReading?.metadata?.avg_aqi) {
            const prevAQI = lastReading.metadata.avg_aqi;
            const increase = ((avgAQI - prevAQI) / prevAQI) * 100;

            if (increase > 20 && avgAQI > 50) {
                spikeDetected = true;
                priority = 1;
                alertTitle = '⚠️ SMOKE SPIKE DETECTED';
            }
        }

        // 3. Upsert to database
        const { error } = await supabaseServer
            .from('neighborhood_intel')
            .upsert({
                source_name: 'Google AQI',
                title: alertTitle,
                description: `Current AQI: ${avgAQI} (${results[0].category}). Dominant: ${dominantPollutant}.`,
                url: 'https://airquality.googleapis.com', // Static source URL
                category: spikeDetected ? 'Safety' : 'Weather',
                priority: priority,
                published_at: new Date().toISOString(),
                metadata: {
                    avg_aqi: avgAQI,
                    locations: results,
                    spike_detected: spikeDetected
                }
            }, {
                onConflict: 'source_name' // Keep only one latest entry per source if we want single-source-of-truth style, 
                // OR logic needs 'url' to be unique. 
                // For tracking history, we might want unique URLs per hour, but user said "upsert".
                // Let's use a dynamic URL to allow history or static to overwrite.
                // User implies "Sentinel" which usually means current state.
                // Let's stick to updating a single record or daily record.
                // To keep history, we'd need unique URLs. Let's append date.
                // url: `https://google.com/aqi/${new Date().toISOString()}` 
            });

        // Actually, to make "Smoke Spike" logic work on "previous hour", we need history. 
        // But checking `neighborhood_intel` for *last inserted* is fine.
        // I will make the URL unique by timestamp to allow history log.

        await supabaseServer.from('neighborhood_intel').insert({
            source_name: 'Google AQI',
            title: alertTitle,
            description: `Current AQI: ${avgAQI} (${results[0].category}). Dominant: ${dominantPollutant}.`,
            url: `https://google.com/aqi/${Date.now()}`,
            category: spikeDetected ? 'Safety' : 'Weather',
            priority: priority,
            published_at: new Date().toISOString(),
            metadata: {
                avg_aqi: avgAQI,
                locations: results,
                spike_detected: spikeDetected
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                avgAQI,
                spikeDetected,
                results
            }
        });

    } catch (error: any) {
        console.error('Environmental Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
