
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    console.log("Testing filter: category IN ['Safety', 'Legislative']");

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('id, title, category')
        .in('category', ['Safety', 'Legislative'])
        .limit(50);

    if (error) {
        console.error("Query Error:", error);
        return;
    }

    const unwanted = data.filter(i => i.category === 'Community News' || i.title.includes('Netflix'));

    if (unwanted.length > 0) {
        console.log("CRITICAL: Found unwanted items despite filter!");
        console.log(JSON.stringify(unwanted, null, 2));
    } else {
        console.log("SUCCESS: Filter correctly excluded News. Total items found:", data.length);
        // Print a few valid ones to be sure
        if (data.length > 0) console.log("Sample valid item:", data[0]);
    }
}

testQuery();
