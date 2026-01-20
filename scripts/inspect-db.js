const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data.length} items:`);
    data.forEach(item => {
        console.log(`- [${item.category}] ${item.title}`);
        console.log(`  Source: ${item.source_name}`);
        console.log(`  URL: ${item.url}`);
        console.log(`  Created: ${item.created_at}`);
        console.log('---');
    });
}

inspect();
