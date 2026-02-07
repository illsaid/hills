const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('❌ Missing Creds in Node env');
    if (!key) console.error('   SUPABASE_SERVICE_ROLE_KEY is missing');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testInsert() {
    console.log('Test inserting 1 record to recent_permits...');

    const payload = {
        permit_number: 'TEST-DEBUG-001',
        address: '123 Test St',
        zip_code: '90046',
        apn: '0000-000-000',
        permit_type: 'Test',
        description: 'Debug insert',
        issue_date: '2025-01-01',
        status: 'Open',
        valuation: 1000,
        zimas_url: 'http://example.com'
    };

    const { data, error } = await supabase
        .from('recent_permits')
        .upsert(payload)
        .select();

    if (error) {
        console.error('❌ Insert Failed:', error);
    } else {
        console.log('✅ Insert Success:', data);
    }
}

testInsert();
