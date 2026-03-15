import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // Create the neighborhood_intel table
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS neighborhood_intel (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    source_name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    url TEXT UNIQUE,
                    category TEXT NOT NULL DEFAULT 'News',
                    published_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_category ON neighborhood_intel(category);
                CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_published ON neighborhood_intel(published_at DESC);
                CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_source ON neighborhood_intel(source_name);
            `
        });

        if (error) {
            // Try direct SQL if RPC not available
            const { error: createError } = await supabase
                .from('neighborhood_intel')
                .select('id')
                .limit(1);

            if (createError && createError.code === '42P01') {
                // Table doesn't exist, return instructions
                return NextResponse.json({
                    success: false,
                    message: 'Table does not exist. Please run the migration manually in Supabase SQL Editor.',
                    sql: `
CREATE TABLE IF NOT EXISTS neighborhood_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE,
    category TEXT NOT NULL DEFAULT 'News',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_category ON neighborhood_intel(category);
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_published ON neighborhood_intel(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_neighborhood_intel_source ON neighborhood_intel(source_name);
                    `.trim()
                });
            }
        }

        // Check if table exists now
        const { data, error: checkError } = await supabase
            .from('neighborhood_intel')
            .select('id')
            .limit(1);

        if (checkError) {
            return NextResponse.json({
                success: false,
                error: checkError.message,
                hint: 'Run the migration SQL manually in Supabase SQL Editor',
            });
        }

        return NextResponse.json({
            success: true,
            message: 'neighborhood_intel table is ready',
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
