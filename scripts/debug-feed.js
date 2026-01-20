const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Simulating API Fetch...');

    // Exact query from route.ts
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('*')
        .order('priority', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ DB Error:', error);
        return;
    }

    console.log(`📊 Returned ${data.length} items`);
    data.forEach((item, i) => {
        console.log(`[${i + 1}] [P:${item.priority}] [${item.category}] ${item.title.substring(0, 40)}...`);
    });
}

check();
