import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');

        if (!address && (!lat || !lon)) {
            return NextResponse.json({ error: 'Provide address or lat/lon' }, { status: 400 });
        }

        let query = supabase
            .from('parcel_details')
            .select('apn, ain, address, city, zip_code, year_built, sqft, units, bedrooms, bathrooms, assessed_value, zoning, use_code, use_type, updated_at');

        if (address) {
            const normalized = address.toUpperCase().trim();
            query = query.ilike('address', `%${normalized}%`);
        }

        const { data, error } = await query.limit(5);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ parcels: data || [], count: (data || []).length });
    } catch (err) {
        console.error('[/api/real-estate/parcel]', err);
        return NextResponse.json({ error: 'Failed to fetch parcel data' }, { status: 500 });
    }
}
