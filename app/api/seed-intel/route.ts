import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample intel items to seed the table
const SEED_ITEMS = [
    {
        source_name: 'CD4 Press Release',
        title: 'Council Moves to Update the Rent Stabilization Ordinance for the First Time in Forty Years',
        description: 'Major RSO updates including new tenant protections and rent increase limits for Hollywood Hills rental properties.',
        url: 'https://cd4.lacity.gov/press-releases/council-moves-to-update-rso/',
        category: 'Housing',
        published_at: '2025-10-31T00:00:00Z',
    },
    {
        source_name: 'CD4 Press Release',
        title: 'Council Permits Single-Stairway Buildings to Spur Housing Growth',
        description: 'New zoning ordinance allows single-stairway residential buildings, affecting hillside development.',
        url: 'https://cd4.lacity.gov/press-releases/council-moves-to-permit-single-stairway-buildings/',
        category: 'Housing',
        published_at: '2025-08-20T00:00:00Z',
    },
    {
        source_name: 'Hollywood Hills Tourism',
        title: 'Tour Bus Regulations on Mulholland Drive',
        description: 'LADOT traffic control measures for tour buses on Mulholland Dr. Tour buses may be ticketed for stopping on restricted hillside streets.',
        url: 'https://cd4.lacity.gov/hollywood-hills-tourism#tour-bus',
        category: 'Traffic',
        published_at: '2025-06-01T00:00:00Z',
    },
    {
        source_name: 'LAFD Alert',
        title: 'Red Flag Warning: High Fire Danger in Hollywood Hills',
        description: 'Due to strong winds and low humidity, residents should exercise extreme caution with any potential fire sources.',
        url: 'https://www.lafd.org/alerts/red-flag-warning-2026-01',
        category: 'Safety',
        published_at: '2026-01-15T00:00:00Z',
    },
    {
        source_name: 'StreetsLA Notice',
        title: 'Laurel Canyon Blvd Resurfacing Scheduled',
        description: 'Pavement preservation work scheduled for Laurel Canyon Blvd between Mulholland and Hollywood Blvd.',
        url: 'https://streetsla.lacity.org/projects/laurel-canyon-2026',
        category: 'Traffic',
        published_at: '2026-01-10T00:00:00Z',
    },
];

export async function GET() {
    try {
        // Try to upsert the sample data
        const { data, error } = await supabase
            .from('neighborhood_intel')
            .upsert(SEED_ITEMS, {
                onConflict: 'url',
                ignoreDuplicates: false,
            })
            .select();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
                hint: 'Table may not exist. Run this SQL in Supabase SQL Editor first:',
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
                `.trim()
            });
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${data?.length || 0} items to neighborhood_intel`,
            items: data,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
