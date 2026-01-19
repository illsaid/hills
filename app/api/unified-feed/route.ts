import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export interface UnifiedFeedItem {
    id: string;
    type: 'safety' | 'event' | 'legislative' | 'intel';
    title: string;
    description: string | null;
    url: string | null;
    category: string;
    source_name: string;
    priority?: number;
    published_at: string;
    created_at: string;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Fetch from neighborhood_intel (Safety, Legislative, etc.)
        const { data: intelData, error: intelError } = await supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .in('category', ['Safety', 'News', 'Legislative'])
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(limit);

        if (intelError) {
            console.error('Intel fetch error:', intelError);
        }

        // Fetch from events table
        const { data: eventsData, error: eventsError } = await supabaseServer
            .from('events')
            .select('*, source:sources(*)')
            .eq('is_seed', false)
            .order('observed_at', { ascending: false })
            .limit(limit);

        if (eventsError) {
            console.error('Events fetch error:', eventsError);
        }

        // Normalize and combine
        const items: UnifiedFeedItem[] = [];

        // Add intel items
        (intelData || []).forEach(item => {
            items.push({
                id: item.id,
                type: item.category === 'Safety' ? 'safety' : item.category === 'Legislative' ? 'legislative' : 'intel',
                title: item.title,
                description: item.description,
                url: item.url,
                category: item.category,
                source_name: item.source_name,
                priority: item.priority,
                published_at: item.published_at || item.created_at,
                created_at: item.created_at,
            });
        });

        // Add events
        (eventsData || []).forEach(event => {
            items.push({
                id: event.id,
                type: 'event',
                title: event.headline,
                description: event.summary,
                url: event.source_url,
                category: event.event_type || 'Event',
                source_name: event.source?.name || 'System',
                priority: event.impact >= 4 ? 1 : event.impact >= 2 ? 2 : 3,
                published_at: event.observed_at || event.created_at,
                created_at: event.created_at,
            });
        });

        // Sort by published_at descending (most recent first)
        items.sort((a, b) => {
            const dateA = new Date(a.published_at).getTime();
            const dateB = new Date(b.published_at).getTime();
            return dateB - dateA;
        });

        // Apply limit after combining
        const limitedItems = items.slice(0, limit);

        return NextResponse.json({
            success: true,
            count: limitedItems.length,
            items: limitedItems,
        });
    } catch (error: any) {
        console.error('Unified Feed API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
