import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export interface UnifiedFeedItem {
    id: string;
    type: 'safety' | 'event' | 'legislative' | 'intel' | 'enforcement' | 'business';
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

        // Fetch Priority Intel (Safety, Legislative) - High Limit
        const { data: priorityData, error: priorityError } = await supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .in('category', ['Safety', 'Legislative'])
            .gte('published_at', cutoffDate(Math.max(DATA_CUTOFFS.SAFETY, DATA_CUTOFFS.LEGISLATIVE)))
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(limit);

        if (priorityError) console.error('Priority Intel error:', priorityError);

        // Fetch News - Restricted Limit to avoid flooding


        const intelData = [...(priorityData || [])];



        // Fetch from events table
        const { data: eventsData, error: eventsError } = await supabaseServer
            .from('events')
            .select('*, source:sources(*)')
            .eq('is_seed', false)
            .gte('observed_at', cutoffDate(DATA_CUTOFFS.SAFETY))
            .order('observed_at', { ascending: false })
            .limit(limit);

        if (eventsError) {
            console.error('Events fetch error:', eventsError);
        }



        // Fetch Code Enforcement
        const { data: codeData, error: codeError } = await supabaseServer
            .from('code_enforcement')
            .select('*')
            .eq('status', 'O') // Open cases only
            .gte('date_opened', cutoffDate(DATA_CUTOFFS.CODE_ENFORCEMENT))
            .order('date_opened', { ascending: false })
            .limit(limit);

        if (codeError) console.error('Code Enforcement fetch error:', codeError);

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
            // Exclude Community News from main feed (they belong in sidebar)
            if (event.source?.name === 'Community News') return;

            items.push({
                id: event.id,
                type: 'event',
                title: event.title,
                description: event.summary,
                url: event.source_url,
                category: event.event_type || 'Event',
                source_name: event.source?.name || 'System',
                priority: event.impact >= 4 ? 1 : event.impact >= 2 ? 2 : 3,
                published_at: event.observed_at || event.created_at,
                created_at: event.created_at,
            });
        });



        // Add Code Enforcement
        (codeData || []).forEach(item => {
            items.push({
                id: `code-${item.id}`,
                type: 'enforcement',
                title: `Code Violation: ${item.case_type}`,
                description: `${item.address} • Case #${item.case_number}`,
                url: null,
                category: 'Code Enforcement',
                source_name: 'LADBS',
                priority: 2, // Slightly higher priority
                published_at: item.date_opened,
                created_at: item.updated_at || item.date_opened,
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
