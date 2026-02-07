
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);

    if (error) console.error(error);
    else console.log(Object.keys(data[0]));
}
inspect();
