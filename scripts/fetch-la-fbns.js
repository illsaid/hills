const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// CONFIGURATION
const ARCGIS_ENDPOINT = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Fictitious_Business_Name/FeatureServer/0/query';
const TARGET_ZIPS = ['90046', '90068', '90069'];

// KEYWORDS
const CATEGORIES = {
    'Contractor': ['Construction', 'Remodeling', 'Electric', 'Plumbing', 'Roofing'],
    'Investor': ['Holdings', 'Investments', 'Properties', 'LLC'],
    'Service': ['Care', 'Wellness', 'Delivery', 'Airbnb', 'Cleaning']
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// UTILS
function extractCategory(businessName) {
    if (!businessName) return null;
    const name = businessName.toUpperCase();

    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
        for (const kw of keywords) {
            if (name.includes(kw.toUpperCase())) {
                return cat;
            }
        }
    }
    return null;
}

async function fetchFBNs() {
    // ArcGIS Query
    // Filter by ZIP 
    const zipWhere = TARGET_ZIPS.map(z => `BusinessZipCode = '${z}'`).join(' OR ');

    const params = new URLSearchParams({
        where: zipWhere,
        outFields: '*',
        outSR: '4326',
        f: 'json',
        orderByFields: 'FiledTS DESC',
        resultRecordCount: '100'
    });

    const url = `${ARCGIS_ENDPOINT}?${params.toString()}`;
    console.log(`🌐 Querying: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        if (json.error) {
            throw new Error(`ArcGIS Error: ${json.error.message}`);
        }

        return json.features || [];
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

async function checkRenewal(businessName, filingDateMs) {
    // Logic: 5 years after an existing record (approx 1825 days)
    const filingDate = new Date(filingDateMs);
    const cutoff = new Date(filingDate);
    cutoff.setFullYear(cutoff.getFullYear() - 4);

    const { data, error } = await supabase
        .from('raw_fbns')
        .select('id')
        .eq('business_name', businessName)
        .lt('filing_date', cutoff.toISOString())
        .limit(1);

    if (error) {
        return false;
    }

    return data && data.length > 0;
}

async function run() {
    console.log('🏗️  Starting FBN Ingestion (ArcGIS Native Fetch)...');

    try {
        const features = await fetchFBNs();
        console.log(`Fetched ${features.length} records.`);

        for (const feature of features) {
            const attr = feature.attributes;

            if (!attr.BusinessName || !attr.FiledTS) continue;

            const bizName = attr.BusinessName;
            const filingDate = new Date(attr.FiledTS);

            const category = extractCategory(bizName);
            const isRenewal = await checkRenewal(bizName, attr.FiledTS);

            const payload = {
                filing_number: attr.FilingNumber,
                business_name: bizName,
                street_address: attr.BusinessAddress,
                city: attr.BusinessCity,
                state: attr.BusinessState,
                zip_code: attr.BusinessZipCode,
                filing_date: filingDate.toISOString(),
                owner_name: attr.RegisteredOwnerName,
                is_renewal: isRenewal,
                category: category,
                raw_data: attr,
                source_id: attr.GlobalID || attr.FilingNumber
            };

            const { error } = await supabase
                .from('raw_fbns')
                .upsert(payload, { onConflict: 'source_id' });

            if (error) console.error(`Failed to upsert ${bizName}:`, error.message);
            else console.log(`Saved: ${bizName} [${category || 'Uncategorized'}] ${isRenewal ? '(Renewal)' : ''}`);
        }

    } catch (err) {
        console.error('❌ Script Failed:', err.message);
    }
}

run();
