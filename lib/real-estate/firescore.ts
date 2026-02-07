/**
 * FireScore Query Helper
 * 
 * Performs point-in-polygon queries against the fire_zones table (PostGIS).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface FireZoneResult {
    source: string;
    zone_class: 'VERY_HIGH' | 'HIGH' | 'OTHER';
}

/**
 * Get the Fire Hazard Severity Zone for a specific point.
 * Uses get_fire_zone RPC function for PostGIS ST_Covers check.
 */
export async function getFireZoneForPoint(lat: number, lon: number): Promise<FireZoneResult | null> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .rpc('get_fire_zone', { lat, lon })
        .single();

    if (error) {
        // If no rows found, .single() returns error code PGRST116
        if (error.code === 'PGRST116') return null;
        console.error('FireScore RPC Error:', error);
        return null;
    }

    return data as FireZoneResult;
}

/**
 * Check if the fire_zones table has any data.
 * Used to display "Not Loaded" state.
 */
export async function checkFireScoreLoaded(): Promise<boolean> {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count, error } = await supabase
        .from('fire_zones')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('FireScore Count Error:', error);
        return false;
    }

    return (count || 0) > 0;
}
