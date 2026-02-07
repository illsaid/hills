
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking code_enforcement table...");

    const { data: dateData, error: dateError } = await supabase
        .from('code_enforcement')
        .select('date_opened, case_number')
        .eq('status', 'O')
        .order('date_opened', { ascending: false })
        .limit(5);

    if (dateError) console.error("Error fetching dates:", dateError);
    else {
        console.log("Recent code enforcement items:");
        console.log(JSON.stringify(dateData, null, 2));
    }
}

checkData();
