const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
    console.log('🧹 Clearing Social Pulse items...');

    const { error } = await supabase
        .from('neighborhood_intel')
        .delete()
        .eq('category', 'Social Pulse');

    if (error) console.error('Error:', error);
    else console.log('✅ Wiped Social Pulse history.');
}

wipe();
