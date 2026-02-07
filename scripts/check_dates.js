
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('code_enforcement')
        .select('date_opened')
        .eq('status', 'O')
        .order('date_opened', { ascending: false })
        .limit(1)
        .single();

    if (error) console.error(error);
    else console.log("Newest Code Violation:", data?.date_opened);
}
check();
