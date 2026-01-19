#!/usr/bin/env node
/**
 * Safety Dispatch Worker
 * 
 * Monitors LAFD incidents for Hollywood Hills area (90068, 90046, 90069)
 * Filters for fire-related keywords and cross-references with AQI
 * 
 * Usage:
 *   node scripts/safety-dispatch.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const TARGET_ZIPS = ['90068', '90046', '90069'];
const FIRE_KEYWORDS = ['BRUSH', 'SMOKE', 'STRUCTURE', 'RESCUE', 'VEGETATION', 'FIRE', 'WILDFIRE'];
const PRIORITY_1_KEYWORDS = ['BRUSH FIRE', 'STRUCTURE FIRE', 'WILDFIRE', 'BRUSH'];
const PRIORITY_2_KEYWORDS = ['SMOKE', 'VEGETATION'];

// LA City Fire Incident Dataset (Socrata) - LAFD Response Metrics
const LAFD_API_URL = 'https://data.lacity.org/resource/n44u-wxe4.json';

// Google Air Quality API (optional)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const AQI_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

// Hollywood Hills approximate coordinates for AQI lookup
const HOLLYWOOD_HILLS_COORDS = { lat: 34.1164, lng: -118.3205 };

/**
 * Determine incident priority based on keywords
 */
function getPriority(incidentType) {
    const upper = (incidentType || '').toUpperCase();

    if (PRIORITY_1_KEYWORDS.some(kw => upper.includes(kw))) {
        return 1; // Critical - Red banner
    }
    if (PRIORITY_2_KEYWORDS.some(kw => upper.includes(kw))) {
        return 2; // High - Orange
    }
    return 3; // Medium - Yellow
}

/**
 * Check if incident is fire-related
 */
function isFireRelated(incidentType) {
    const upper = (incidentType || '').toUpperCase();
    return FIRE_KEYWORDS.some(kw => upper.includes(kw));
}

/**
 * Fetch current AQI for Hollywood Hills (optional)
 */
async function fetchAQI() {
    if (!GOOGLE_API_KEY) {
        console.log('⚠️ No GOOGLE_MAPS_API_KEY - skipping AQI check');
        return null;
    }

    try {
        const response = await fetch(`${AQI_API_URL}?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: {
                    latitude: HOLLYWOOD_HILLS_COORDS.lat,
                    longitude: HOLLYWOOD_HILLS_COORDS.lng
                }
            })
        });

        if (!response.ok) {
            console.error('AQI API error:', response.status);
            return null;
        }

        const data = await response.json();
        const aqi = data.indexes?.[0]?.aqi;
        console.log(`📊 Current AQI: ${aqi || 'N/A'}`);
        return aqi || null;
    } catch (error) {
        console.error('AQI fetch error:', error.message);
        return null;
    }
}

/**
 * Fetch active incidents (API or simulation)
 */
async function fetchActiveIncidents() {
    console.log('📡 Fetching active incidents...');

    // Check for simulation mode via flag or env
    const isSim = process.argv.includes('--sim') || process.env.SAFETY_DISPATCH_SIM === 'true';

    if (isSim) {
        console.log('🧪 Running in SIMULATION mode');
        return [
            {
                incident_number: 'SIM001',
                incident_type: 'BRUSH FIRE',
                address: '2800 N Beachwood Dr',
                zip_code: '90068',
                incident_date: new Date().toISOString(),
            },
            {
                incident_number: 'SIM002',
                incident_type: 'SMOKE INVESTIGATION',
                address: '8000 Sunset Blvd',
                zip_code: '90046',
                incident_date: new Date().toISOString(),
            },
            {
                incident_number: 'SIM003',
                incident_type: 'VEGETATION FIRE',
                address: '1500 Laurel Canyon Blvd',
                zip_code: '90069',
                incident_date: new Date().toISOString(),
            },
        ];
    }

    // TODO: Replace with real API when available
    // Currently LAFD Socrata (n44u-wxe4) lacks incident_type and zip fields
    // Options: PulsePoint, LAIT911, or LA GeoHub when configured
    console.log('ℹ️ No live API configured - use --sim flag to test with sample data');
    return [];
}

/**
 * Process and filter incidents
 */
async function processIncidents(incidents) {
    const safetyItems = [];
    let fireCount = 0;

    for (const incident of incidents) {
        const incidentType = incident.incident_type || incident.inc_type_desc || '';

        // Filter for fire-related keywords
        if (!isFireRelated(incidentType)) {
            continue;
        }

        fireCount++;
        const priority = getPriority(incidentType);
        const zip = incident.zip_code || 'Unknown';
        const incidentId = `lafd-${incident.incident_number || incident.row_id}-${zip}`;

        safetyItems.push({
            source_name: 'LAFD Dispatch',
            title: incidentType,
            description: `${incidentType} reported at ${incident.address || 'Unknown location'} in ${zip}`,
            url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.address + ' ' + zip)}`,
            category: 'Safety',
            priority: priority,
            incident_id: incidentId,
            published_at: incident.incident_date || new Date().toISOString(),
        });
    }

    console.log(`🔥 Found ${fireCount} fire-related incidents`);
    return safetyItems;
}

/**
 * Upsert safety items to database
 */
async function upsertSafetyItems(items) {
    if (items.length === 0) {
        console.log('⚠️ No safety items to insert');
        return;
    }

    // Upsert with conflict resolution on incident_id
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .upsert(items, {
            onConflict: 'incident_id',
            ignoreDuplicates: false,
        })
        .select();

    if (error) {
        // If incident_id column doesn't exist, fall back to url dedup
        if (error.message.includes('incident_id') || error.message.includes('priority')) {
            console.log('⚠️ Missing columns detected, using URL dedup with base fields');
            const cleanItems = items.map(i => {
                const { incident_id, priority, ...rest } = i;
                return rest;
            });
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('neighborhood_intel')
                .upsert(cleanItems, {
                    onConflict: 'url',
                    ignoreDuplicates: false,
                })
                .select();

            if (fallbackError) {
                console.error('❌ Supabase error:', fallbackError.message);
                return;
            }
            console.log(`✅ Upserted ${fallbackData?.length || 0} safety items (URL dedup)`);
            return fallbackData;
        }

        console.error('❌ Supabase error:', error.message);
        return;
    }

    console.log(`✅ Upserted ${data?.length || 0} safety items`);
    return data;
}

/**
 * Main executor
 */
async function main() {
    console.log('\n🚨 Safety Dispatch Worker Starting...\n');
    console.log(`📍 Target Zips: ${TARGET_ZIPS.join(', ')}`);
    console.log(`🔍 Keywords: ${FIRE_KEYWORDS.join(', ')}\n`);

    try {
        // 1. Fetch active incidents
        const incidents = await fetchActiveIncidents();

        if (incidents.length === 0) {
            console.log('ℹ️ No recent incidents found in target area');
            console.log('\n✨ Done!\n');
            return;
        }

        // 2. Process and filter incidents
        const safetyItems = await processIncidents(incidents);

        // 3. Check AQI if fire incidents found
        if (safetyItems.length > 0) {
            const aqi = await fetchAQI();
            if (aqi && aqi > 100) {
                console.log(`⚠️ AQI elevated (${aqi}) - air quality concern`);
            }
        }

        // 4. Preview items
        if (safetyItems.length > 0) {
            console.log('\n📊 Safety Items:');
            safetyItems.forEach(item => {
                const priorityLabel = item.priority === 1 ? '🔴 P1' : item.priority === 2 ? '🟠 P2' : '🟡 P3';
                console.log(`   ${priorityLabel} ${item.title}`);
            });
            console.log('');
        }

        // 5. Upsert to database
        await upsertSafetyItems(safetyItems);

        console.log('\n✨ Done!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
