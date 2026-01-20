const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking Priorities...');

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('*')
        .order('priority', { ascending: true }) // Show high priority first
        .limit(20);

    if (error) {
        console.log('Error:', error);
        return;
    }

    data.forEach(item => {
        console.log(`[P:${item.priority}] ${item.category} - ${item.title.substring(0, 40)}...`);
    });
}
check();
