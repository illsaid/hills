const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// CONFIGURATION
const ARCGIS_ENDPOINT = 'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query';
const TARGET_ZIPS = ['90046', '90068', '90069'];
const BATCH_SIZE = 1000; // Max allowed by many MapServers

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchParcelsBatch(zip, offset = 0) {
    // Query by ZIP
    // We use a wildcard for zip to be safe or exact match? 'SitusZIP LIKE '90068%'' covers 90068-1234
    const where = `SitusZIP LIKE '${zip}%'`;

    const params = new URLSearchParams({
        where: where,
        outFields: '*', // Fetch all fields to map carefully
        f: 'json',
        resultOffset: offset,
        resultRecordCount: BATCH_SIZE,
        orderByFields: 'OBJECTID' // Ensure stable pagination
    });

    const url = `${ARCGIS_ENDPOINT}?${params.toString()}`;
    console.log(`🌐 Querying ${zip} (Offset ${offset})...`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.error) throw new Error(`ArcGIS Error: ${json.error.message}`);

    return json.features || [];
}

async function processZip(zip) {
    let offset = 0;
    let keepGoing = true;
    let totalProcessed = 0;

    console.log(`\n📦 Processing Zip: ${zip}`);

    while (keepGoing) {
        try {
            const features = await fetchParcelsBatch(zip, offset);

            if (features.length === 0) {
                keepGoing = false;
                break;
            }

            const upserts = features.map(f => {
                const a = f.attributes;

                // Value Calculation: Land + Improvement
                // Note: Fields might vary, check sample. 'Roll_LandValue', 'Roll_ImpValue'
                const land = a.Roll_LandValue || 0;
                const imp = a.Roll_ImpValue || 0;
                const totalValue = land + imp;

                // Address Construction
                const addr = a.SitusFullAddress || a.SitusAddress || `${a.SitusHouseNo} ${a.SitusStreet}`;

                return {
                    apn: a.APN, // e.g. "5555-002-013"
                    ain: a.AIN, // e.g. "5555002013"
                    address: addr,
                    city: a.SitusCity,
                    zip_code: a.SitusZIP ? a.SitusZIP.split('-')[0] : zip, // Normalize zip
                    year_built: a.YearBuilt1,
                    sqft: a.SQFTmain1,
                    units: a.Units1,
                    bedrooms: a.Bedrooms1,
                    bathrooms: a.Bathrooms1,
                    assessed_value: totalValue,
                    zoning: a.QualityClass1, // 'D7' etc. Valid zoning might be elsewhere or this is best proxy for now.
                    use_code: a.UseCode, // '050G'
                    use_type: a.UseType, // 'Residential'
                    raw_data: a,
                    updated_at: new Date()
                };
            }).filter(p => p.apn); // Ensure APN exists

            if (upserts.length > 0) {
                const { error } = await supabase
                    .from('parcel_details')
                    .upsert(upserts, { onConflict: 'apn' });

                if (error) console.error(`❌ Batch Upsert Failed:`, error.message);
                else totalProcessed += upserts.length;
            }

            offset += features.length;

            // Safety break for testing/limits (Optional)
            if (features.length < BATCH_SIZE) keepGoing = false;

        } catch (err) {
            console.error(`❌ Error fetching batch: ${err.message}`);
            keepGoing = false;
        }
    }
    console.log(`✅ Finished ${zip}: ${totalProcessed} parcels.`);
}

async function run() {
    console.log('🏗️  Starting Parcel Details Ingestion...');

    for (const zip of TARGET_ZIPS) {
        await processZip(zip);
    }

    console.log('\n🎉 Ingestion Complete.');
}

run();
