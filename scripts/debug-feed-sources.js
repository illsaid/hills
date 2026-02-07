const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('🔍 Checking Data Sources...');

    // 1. Fictitious Business Names
    const { count: fbnCount, error: fbnError } = await supabase
        .from('raw_fbns')
        .select('*', { count: 'exact', head: true });

    if (fbnError) console.error('❌ FBN Table Error:', fbnError.message);
    else console.log(`✅ FBN Records: ${fbnCount}`);

    // 2. Code Enforcement
    const { count: codeCount, error: codeError } = await supabase
        .from('code_enforcement')
        .select('*', { count: 'exact', head: true });

    if (codeError) console.error('❌ Code Enforcement Table Error:', codeError.message);
    else console.log(`✅ Code Cases: ${codeCount}`);

    // 3. CD4 Press Releases in neighborhood_intel
    const { data: cd4Data, error: cd4Error } = await supabase
        .from('neighborhood_intel')
        .select('title, published_at')
        .ilike('source_name', '%CD4%')
        .limit(3);

    if (cd4Error) console.error('❌ CD4 Check Error:', cd4Error.message);
    else {
        console.log(`✅ CD4 Press Releases Found: ${cd4Data.length}`);
        cd4Data.forEach(i => console.log(`   - ${i.title}`));
    }
}

checkTables();
