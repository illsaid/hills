const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDates() {
    console.log('📅 Checking Data Dates...');

    // FBN
    const { data: fbns } = await supabase
        .from('raw_fbns')
        .select('business_name, filing_date')
        .order('filing_date', { ascending: false })
        .limit(3);

    console.log('--- FBNs ---');
    fbns?.forEach(i => console.log(`${i.filing_date}: ${i.business_name}`));

    // Code
    const { data: codes } = await supabase
        .from('code_enforcement')
        .select('case_type, date_opened')
        .order('date_opened', { ascending: false })
        .limit(3);

    console.log('--- Code Enforcement ---');
    codes?.forEach(i => console.log(`${i.date_opened}: ${i.case_type}`));

    // Compare with Intel
    const { data: intel } = await supabase
        .from('neighborhood_intel')
        .select('title, published_at')
        .order('published_at', { ascending: false })
        .limit(3);

    console.log('--- Intel/News ---');
    intel?.forEach(i => console.log(`${i.published_at}: ${i.title}`));
}

checkDates();
