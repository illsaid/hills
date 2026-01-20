const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('🔍 Checking neighborhood_intel categories...');

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('category, source_name, count'); // count isn't valid in select like this usually, need to group

    // Simple fetch all and aggregate in JS for speed
    const { data: allItems, error: fetchError } = await supabase
        .from('neighborhood_intel')
        .select('category, source_name, created_at, published_at')
        .order('published_at', { ascending: false })
        .limit(100);

    if (fetchError) {
        console.error('❌ Error:', fetchError);
        return;
    }

    const counts = {};
    allItems.forEach(item => {
        const key = `${item.category} (${item.source_name})`;
        counts[key] = (counts[key] || 0) + 1;
    });

    console.log('📊 Distribution (Last 100 items):');
    Object.entries(counts).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log('\n🕒 Latest Items:');
    allItems.slice(0, 5).forEach(item =>
        console.log(`   [${item.published_at}] ${item.category} - ${item.source_name}`)
    );
}

check();
