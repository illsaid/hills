import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export interface SafetyIncident {
    id: string;
    source_name: string;
    title: string;
    description: string | null;
    url: string;
    category: string;
    priority?: number;
    published_at: string | null;
}

export async function GET() {
    try {
        // Try fetching with priority column first
        let { data, error } = await supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .eq('category', 'Safety')
            .order('published_at', { ascending: false })
            .limit(10);

        // If priority column doesn't exist, query still works but we handle priority client-side
        if (error) {
            console.error('Safety Dispatch API Error:', error);

            // If it's a column error, try without priority ordering
            if (error.message.includes('priority')) {
                const fallback = await supabaseServer
                    .from('neighborhood_intel')
                    .select('*')
                    .eq('category', 'Safety')
                    .order('published_at', { ascending: false })
                    .limit(10);

                data = fallback.data;
                if (fallback.error) {
                    return NextResponse.json(
                        { success: false, error: fallback.error.message },
                        { status: 500 }
                    );
                }
            } else {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }
        }

        // Determine priority based on keywords if priority column not set
        const PRIORITY_1_KEYWORDS = ['BRUSH', 'STRUCTURE FIRE', 'WILDFIRE'];

        const processedData = (data || []).map(item => {
            const title = (item.title || '').toUpperCase();
            let priority = item.priority || 3;

            if (PRIORITY_1_KEYWORDS.some(kw => title.includes(kw))) {
                priority = 1;
            } else if (title.includes('SMOKE') || title.includes('VEGETATION')) {
                priority = 2;
            }

            return { ...item, priority };
        });

        // Sort by priority
        processedData.sort((a, b) => a.priority - b.priority);

        // Find the highest priority incident
        const priority1 = processedData.find(d => d.priority === 1);
        const priority2 = processedData.find(d => d.priority === 2);

        return NextResponse.json({
            success: true,
            count: processedData.length,
            hasPriority1: !!priority1,
            hasPriority2: !!priority2,
            priority1Incident: priority1 || null,
            incidents: processedData,
        });
    } catch (error: any) {
        console.error('Safety Dispatch API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

