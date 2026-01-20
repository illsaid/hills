const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('🔄 Running migration: Adding priority and metadata columns...');

    const { error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE neighborhood_intel 
            ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

            CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_priority ON neighborhood_intel(priority);
        `
    });

    if (error) {
        console.error('❌ Migration failed via RPC (expected if exec_sql not enabled), falling back to SQL Editor hint:', error.message);
        console.log('\n⚠️ PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:\n');
        console.log(`
            ALTER TABLE neighborhood_intel 
            ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
            
            CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_priority ON neighborhood_intel(priority);
        `);
    } else {
        console.log('✅ Migration successful!');
    }
}

migrate();
