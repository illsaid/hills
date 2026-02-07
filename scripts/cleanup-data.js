const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('🧹 Cleaning up stale simulated data...');

    // The simulation data used source_name = 'LAFD Dispatch'
    // The new live data uses source_name = 'LAFD Alert'

    // Also specifically target the known simulation addresses to be safe
    const simAddresses = [
        '2800 N Beachwood Dr',
        '8000 Sunset Blvd',
        '1500 Laurel Canyon Blvd'
    ];

    // Delete by source_name 'LAFD Dispatch' which was used by the simulator
    const { error: err1, count: count1 } = await supabase
        .from('neighborhood_intel')
        .delete({ count: 'exact' })
        .eq('source_name', 'LAFD Dispatch');

    if (err1) console.error('Error deleting by source:', err1);
    else console.log(`✅ Removed ${count1} records with source 'LAFD Dispatch'`);

    // Double check for the specific descriptions just in case
    for (const addr of simAddresses) {
        const { error, count } = await supabase
            .from('neighborhood_intel')
            .delete({ count: 'exact' })
            .ilike('description', `%${addr}%`);

        if (!error && count > 0) {
            console.log(`✅ Removed ${count} records containing '${addr}'`);
        }
    }

    console.log('✨ Cleanup complete.');
}

main();
