const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDistribution() {
    console.log('Checking recent neighborhood_intel items...');
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('category, published_at')
        .order('published_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(d => {
        counts[d.category] = (counts[d.category] || 0) + 1;
    });

    console.log('Top 100 items distribution:', counts);

    // Check Code Enforcement count in total
    const { count: codeCount } = await supabase.from('code_enforcement').select('*', { count: 'exact', head: true });
    console.log('Total Code Enforcement items:', codeCount);
}

checkDistribution();
