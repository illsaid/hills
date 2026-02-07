const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function clean() {
    const { error } = await supabase
        .from('recent_permits')
        .delete()
        .eq('permit_number', 'TEST-DEBUG-001');

    if (error) console.error('Error cleaning up:', error);
    else console.log('✅ Cleaned up test record.');
}

clean();
