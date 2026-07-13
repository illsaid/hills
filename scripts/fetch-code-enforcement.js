const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// DATASET: LADBS Code Enforcement
const SOCRATA_ENDPOINT = 'https://data.lacity.org/resource/u82d-eh7z.json';
const APP_TOKEN = process.env.LACITY_APP_TOKEN;

const TARGET_ZIPS = ['90046', '90068', '90069'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchCodeCases(offset = 0) {
    // Socrata SoQL
    // Filter: zip matches 90046... AND stat='O'
    // Column: 'zip' (Sample: "90069-")
    // Use valid SoQL OR logic for zips
    const zipFilters = TARGET_ZIPS.map(z => `starts_with(zip, '${z}')`).join(' OR ');
    const where = `(${zipFilters}) AND stat='O'`;

    // Select recent cases first
    const params = new URLSearchParams({
        $where: where,
        $limit: '100',
        $offset: offset,
        $order: 'adddttm DESC' // Date Added/Opened
    });
    if (APP_TOKEN) params.append('$$app_token', APP_TOKEN);

    const url = `${SOCRATA_ENDPOINT}?${params.toString()}`;
    console.log(`🌐 Querying: ${params.toString()}`); // Log params only to keep clean

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}

async function run() {
    console.log('🏗️  Starting Code Enforcement Ingestion...');

    try {
        const cases = await fetchCodeCases();
        console.log(`Fetched ${cases.length} OPEN cases.`);

        // Ingest-time geocoding (polite: 1.1s delay, capped per run).
        // Nominatim blocks parallel/datacenter render-time requests, so we
        // geocode once here and store coords for the dashboard map.
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        async function geocode(address) {
            try {
                const q = encodeURIComponent(`${address}, Los Angeles, CA`);
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1&countrycodes=us`, {
                    headers: { 'User-Agent': 'HillsLedger/1.0 (ingest; contact: 9000.eom@gmail.com)' }
                });
                if (!res.ok) return null;
                const results = await res.json();
                if (!results.length) return null;
                return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
            } catch { return null; }
        }

        // Skip geocoding for cases that already have coords in the DB
        const { data: existing } = await supabase
            .from('code_enforcement')
            .select('case_number, lat')
            .in('case_number', cases.map(c => c.apno));
        const hasCoords = new Set((existing || []).filter(e => e.lat != null).map(e => e.case_number));

        let geocodeBudget = 20; // max lookups per run; catches up across daily runs

        for (const c of cases) {
            // Field Mapping from Schema Probe
            // apno: "119009" (Case Num)
            // stno, predir, stname, suffix (Address)
            // aptype: "VEIP" (Type)
            // stat: "O" (Status)
            // adddttm: "2004..." (Date) 
            // lat/lon: Not seen in probe sample? If missing, leave null. user DB has lat/lon. 
            // Probe showed 'prclid'? 'apc'? 
            // check if keys have Location object? (Probe output truncated?)

            const fullAddress = `${c.stno || ''} ${c.predir || ''} ${c.stname || ''} ${c.suffix || ''}`.replace(/\s+/g, ' ').trim();

            const payload = {
                case_number: c.apno,
                address: fullAddress,
                case_type: c.aptype, // e.g. "SUBSTANDARD" or "VEIP"
                // No clear violation description in probe? 'aptype' is best proxy.
                violation_description: c.aptype,
                date_opened: c.adddttm,
                status: c.stat, // 'O'
                council_district: null, // Probe didn't show district column, might be strictly zip based here. 
                updated_at: new Date()
            };

            // Prefer coords from the source record if present; else geocode
            const srcLat = c.location_1?.latitude ?? c.lat;
            const srcLon = c.location_1?.longitude ?? c.lon;
            if (srcLat != null && srcLon != null) {
                payload.lat = parseFloat(srcLat);
                payload.lon = parseFloat(srcLon);
            } else if (fullAddress && !hasCoords.has(c.apno) && geocodeBudget > 0) {
                geocodeBudget--;
                const geo = await geocode(fullAddress);
                await sleep(1100);
                if (geo) { payload.lat = geo.lat; payload.lon = geo.lon; }
            }

            const { error } = await supabase
                .from('code_enforcement')
                .upsert(payload, { onConflict: 'case_number' });

            if (error) console.error(`Failed to save ${c.apno}:`, error.message);
        }
        console.log('✅ Batch complete.');

    } catch (err) {
        console.error('❌ Script Failed:', err.message);
    }
}

run();
