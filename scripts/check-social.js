const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking for Social Pulse records...');

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('*')
        .eq('category', 'Social Pulse');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No Social Pulse records found.');
    } else {
        console.log(`✅ Found ${data.length} records:`);
        data.forEach(item => {
            console.log(`- [${item.priority}] ${item.source_name}: ${item.title}`);
        });
    }
}

check();
