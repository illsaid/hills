
import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOTICES = [
    {
        Title: "HHWNC Board Meeting, March 18, 2026",
        Date: "March 18, 2026",
        URL: "https://www.hhwnc.org/news/hhwnc-board-meeting-march-18-2026/"
    },
    {
        Title: "HHWNC Board Meeting, February 18, 2026",
        Date: "February 18, 2026",
        URL: "https://www.hhwnc.org/news/hhwnc-board-meeting-february-18-2026/"
    },
    {
        Title: "HHWNC Board Meeting, January 21, 2026",
        Date: "January 21, 2026",
        URL: "https://www.hhwnc.org/news/hhwnc-board-meeting-january-21-2026/"
    },
    {
        Title: "HHWNC Board Meeting, November 19, 2025",
        Date: "November 19, 2025",
        URL: "https://www.hhwnc.org/news/hhwnc-board-meeting-november-19-2025/"
    }
];

export async function GET() {
    try {
        const area = await supabaseServer
            .from('areas')
            .select('id')
            .eq('slug', 'hollywood-hills')
            .single();

        if (!area.data) {
            return NextResponse.json({ error: 'Area not found' }, { status: 404 });
        }

        const results = [];

        for (const notice of NOTICES) {
            // Fix date parsing
            const observedAt = new Date(notice.Date + " 19:00:00").toISOString();

            // Check for existing event by URL manually since constraint is missing
            const { data: existing } = await supabaseServer
                .from('events')
                .select('id')
                .eq('source_url', notice.URL)
                .maybeSingle();

            if (existing) {
                results.push({ title: notice.Title, status: 'skipped', id: existing.id });
                continue;
            }

            const { data, error } = await supabaseServer
                .from('events')
                .insert({
                    area_id: area.data.id,
                    source_id: null,
                    event_type: 'OTHER',
                    level: 'INFO',
                    verification: 'VERIFIED',
                    impact: 2,
                    title: notice.Title,
                    summary: `Public Notice: ${notice.Title}. See official website for agenda.`,
                    location_label: 'Hollywood Hills',
                    observed_at: observedAt,
                    source_url: notice.URL,
                    confidence_basis: 'Official HHWNC Website',
                })
                .select();

            if (error) {
                console.error('Insert error:', error);
                results.push({ title: notice.Title, status: 'error', error });
            } else {
                results.push({ title: notice.Title, status: 'seeded', id: data?.[0]?.id });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
