import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export interface NeighborhoodIntelItem {
    id: string;
    source_name: string;
    title: string;
    description: string | null;
    url: string;
    category: string;
    published_at: string | null;
    created_at: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const category = searchParams.get('category');

        let query = supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        const CATEGORY_CUTOFFS: Record<string, number> = {
            'News Feed': DATA_CUTOFFS.NEWS,
            'Safety': DATA_CUTOFFS.SAFETY,
            'Maintenance': DATA_CUTOFFS.MAINTENANCE,
            'Housing': DATA_CUTOFFS.MARKET,
            'Legislative': DATA_CUTOFFS.LEGISLATIVE,
            'Activity': DATA_CUTOFFS.ACTIVITY,
        };

        const defaultCutoffDays = 30;

        if (category) {
            query = query.eq('category', category);
            const days = CATEGORY_CUTOFFS[category] ?? defaultCutoffDays;
            query = query.gte('published_at', cutoffDate(days));
        } else {
            query = query.gte('published_at', cutoffDate(defaultCutoffDays));
        }

        const { data, error } = await query;

        if (error) {
            console.error('Neighborhood Feed API Error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            items: data || [],
        });
    } catch (error: any) {
        console.error('Neighborhood Feed API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
