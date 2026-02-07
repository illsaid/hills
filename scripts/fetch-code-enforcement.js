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
                // lat: c.location_1?.latitude, // If not present, null
                // lon: c.location_1?.longitude,
                updated_at: new Date()
            };

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
