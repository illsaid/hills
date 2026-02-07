
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('category, title, created_at')
        .ilike('title', '%Netflix is About to Lose%')
        .limit(1);

    if (error) console.error(error);
    else console.log("Found Item:", data);

    // Also check distinct categories
    const { data: cats } = await supabase
        .from('neighborhood_intel')
        .select('category')
        .limit(100);

    // summarize
    const summary = {};
    cats.forEach(c => summary[c.category] = (summary[c.category] || 0) + 1);
    console.log("Categories sample:", summary);
}
check();
