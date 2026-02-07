import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        // Fetch FBNs
        const { data: fbnData, error: fbnError } = await supabaseServer
            .from('raw_fbns')
            .select('*')
            .order('filing_date', { ascending: false })
            .limit(limit);

        if (fbnError) {
            console.error('FBN fetch error:', fbnError);
            throw fbnError;
        }

        const items = (fbnData || []).map(item => ({
            id: `fbn-${item.id}`,
            title: item.business_name,
            description: `${item.category || 'Uncategorized'} • ${item.street_address}, ${item.city}`,
            category: item.category || 'Business',
            filing_date: item.filing_date,
            created_at: item.created_at || item.filing_date,
            is_renewal: item.is_renewal
        }));

        return NextResponse.json({
            success: true,
            count: items.length,
            items: items,
        });
    } catch (error: any) {
        console.error('Business Feed API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
