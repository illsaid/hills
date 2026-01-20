const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('🧹 Cleaning up neighborhood intel...');

    // Delete everything that is NOT source_name = 'LAFD Alert'
    // This wipes the seed data (CD4 Press Release, etc) and simulation data (LAFD Dispatch)
    // We keep 'LAFD Alert' because that's our real scraper output
    const { data, error, count } = await supabase
        .from('neighborhood_intel')
        .delete({ count: 'exact' })
        .neq('source_name', 'LAFD Alert');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`✅ Deleted ${count} items. Only real LAFD Alerts remain.`);
}

cleanup();
