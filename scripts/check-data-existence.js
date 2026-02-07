const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking raw_fbns ---');
    const { data: fbn, error: fbnError } = await supabase
        .from('raw_fbns')
        .select('*')
        .order('filing_date', { ascending: false })
        .limit(5);

    if (fbnError) console.error('FBN Error:', fbnError.message);
    else {
        console.log(`FBN Count: ${fbn.length}`);
        fbn.forEach(i => console.log(`[${i.filing_date}] ${i.business_name}`));
    }

    console.log('\n--- Checking code_enforcement ---');
    const { data: ce, error: ceError } = await supabase
        .from('code_enforcement')
        .select('*')
        .order('date_opened', { ascending: false })
        .limit(5);

    if (ceError) console.error('Code Error:', ceError.message);
    else {
        console.log(`Code Count: ${ce.length}`);
        ce.forEach(i => console.log(`[${i.date_opened}] ${i.case_type}`));
    }
}

checkTables();
