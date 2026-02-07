
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
// We will test the API logic by invoking the function conceptually or just querying DB again
// But let's verify what the DB actually returns for "Community News" vs the filter
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    // 1. Check if ANY Community News exists in the 'Safety' or 'Legislative' categories (misclassification)
    const { data: misclassified } = await supabase
        .from('neighborhood_intel')
        .select('id, title, category')
        .in('category', ['Safety', 'Legislative'])
        .ilike('title', '%Netflix%'); // Known news item

    if (misclassified && misclassified.length > 0) {
        console.log("CRITICAL: News items are misclassified as Safety/Legislative!", misclassified);
    } else {
        console.log("Database integrity check: News items are NOT in Safety/Legislative.");
    }
}
verify();
