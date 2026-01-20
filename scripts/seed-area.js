const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSeed() {
    console.log('🔍 Checking for Hollywood Hills area...');

    // Check if area exists
    const { data: existing, error: checkError } = await supabase
        .from('areas')
        .select('*')
        .eq('slug', 'hollywood-hills')
        .single();

    if (existing) {
        console.log('✅ Area "Hollywood Hills" already exists.');
        return;
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Relation null" (no rows)
        console.error('❌ Error checking area:', checkError.message);
        return;
    }

    console.log('⚠️ Area missing. Seeding now...');

    // Insert area
    const { data: inserted, error: insertError } = await supabase
        .from('areas')
        .insert({
            name: 'Hollywood Hills',
            slug: 'hollywood-hills',
            description: 'Neighborhood dashboard for 90068, 90046, 90069',
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert error:', insertError.message);
        return;
    }

    console.log('✅ Successfully seeded area:', inserted.name);
}

checkAndSeed();
