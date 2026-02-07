const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role to bypass RLS issues
);

async function check() {
    const { count, error } = await supabase
        .from('recent_permits')
        .select('*', { count: 'exact', head: true });

    if (error) console.error('Error:', error);
    else console.log('Total Permits in DB:', count);

    const { data } = await supabase
        .from('recent_permits')
        .select('*')
        .limit(5);

    console.log('Sample:', data);
}

check();
