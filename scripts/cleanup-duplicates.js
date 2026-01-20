const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('🧹 Removing duplicates (bit.ly links)...');

    const { data, error, count } = await supabase
        .from('neighborhood_intel')
        .delete({ count: 'exact' })
        .ilike('url', '%bit.ly%');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`✅ Deleted ${count} items with bit.ly links.`);
}

cleanup();
