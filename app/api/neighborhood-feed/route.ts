import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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

        // Optional category filter
        if (category) {
            query = query.eq('category', category);

            // For News Feed, only show posts from the last 48 hours
            if (category === 'News Feed') {
                const cutoff = new Date();
                cutoff.setHours(cutoff.getHours() - 48);
                query = query.gte('published_at', cutoff.toISOString());
            }
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
