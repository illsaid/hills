const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAccess() {
    console.log('🔍 Checking access with ANON key...');

    const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('slug', 'hollywood-hills')
        .single();

    if (error) {
        console.error('❌ Error (Anon):', error.message);
        console.error('   Hint: If this is "PGRST116" it means 0 rows found (RLS might be hiding it).');
        console.error('   Hint: If this is "permission denied", RLS is blocking read.');
    } else {
        console.log('✅ Success (Anon): Found area', data);
    }
}

checkAccess();
