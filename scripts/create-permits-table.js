const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    console.log('🏗️  Creating recent_permits table...');

    const sql = `
    CREATE TABLE IF NOT EXISTS recent_permits (
        permit_number TEXT PRIMARY KEY,
        address TEXT,
        zip_code TEXT,
        apn TEXT,
        permit_type TEXT,
        description TEXT,
        issue_date DATE,
        status TEXT,
        valuation NUMERIC,
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        zimas_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Index for faster filtering by zip
    CREATE INDEX IF NOT EXISTS idx_recent_permits_zip ON recent_permits(zip_code);
    -- Index for lat/lon filtering
    CREATE INDEX IF NOT EXISTS idx_recent_permits_coords ON recent_permits(lat, lon);
    `;

    console.log('🔄 Attempting migration via RPC...');

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
        console.error('❌ RPC failed, falling back to SQL hint:', error.message);
        console.log('\n⚠️  ACTION REQUIRED: Run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('✅ Table created successfully via RPC.');
    }
}

createTable();
