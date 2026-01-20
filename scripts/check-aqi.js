const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking for Google AQI record...');

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('*')
        .eq('source_name', 'Google AQI');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No Google AQI records found.');
    } else {
        console.log(`✅ Found ${data.length} records:`);
        console.log(JSON.stringify(data[0], null, 2));
    }
}

check();
