
import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOTICES = [
    {
        title: "HHWNC Board Meeting, March 18, 2026",
        url: "https://www.hhwnc.org/news/hhwnc-board-meeting-march-18-2026/",
        date: "January 13, 2026"
    },
    {
        title: "HHWNC Board Meeting, February 18, 2026",
        url: "https://www.hhwnc.org/news/hhwnc-board-meeting-february-18-2026/",
        date: "January 13, 2026"
    },
    {
        title: "HHWNC Board Meeting, January 21, 2026",
        url: "https://www.hhwnc.org/news/hhwnc-board-meeting-january-21-2026/",
        date: "January 13, 2026"
    },
    {
        title: "HHWNC Board Meeting, November 19, 2025",
        url: "https://www.hhwnc.org/news/hhwnc-board-meeting-november-19-2025/",
        date: "November 13, 2025"
    },
    {
        title: "ZONE ZERO Forces Tree Removal Within 5 Feet of Your Residence",
        url: "https://www.hhwnc.org/news/zone-zero-forces-tree-removal-within-5-feet-of-your-residence/",
        date: "November 11, 2025"
    },
    {
        title: "Housing Meeting / Tuesday, November 18, 6:30 PM",
        url: "https://www.hhwnc.org/news/housing-meeting-tuesday-november-18-630-pm/",
        date: "November 11, 2025"
    },
    {
        title: "LAPD Halloween Safety Tips",
        url: "https://www.hhwnc.org/news/lapd-halloween-safety-tips/",
        date: "October 24, 2025"
    },
    {
        title: "CPAB Meeting Recap – 09 16 2025",
        url: "https://www.hhwnc.org/news/cpab-meeting-recap-09-16-2025/",
        date: "October 7, 2025"
    },
    {
        title: "Metro Plan for Bus Lanes on Sunset Blvd Wants Stakeholder Input",
        url: "https://www.hhwnc.org/news/metro-plan-for-bus-lanes-on-sunset-blvd-wants-stakeholder-input/",
        date: "October 7, 2025"
    },
    {
        title: "HOLLYWOOD RESIDENTS: LAPD COMMUNITY SURVEY",
        url: "https://www.hhwnc.org/news/hollywood-residents-lapd-community-survey/",
        date: "September 18, 2025"
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
            // Use the actual posted date for "observed_at"
            // Defaulting to 9am on that date
            const observedAt = new Date(notice.date + " 09:00:00").toISOString();

            // Check for existing event by URL manually
            const { data: existing } = await supabaseServer
                .from('events')
                .select('id')
                .eq('source_url', notice.url)
                .maybeSingle();

            if (existing) {
                results.push({ title: notice.title, status: 'skipped', id: existing.id });
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
                    title: notice.title,
                    summary: `News from HHWNC: ${notice.title}`,
                    location_label: 'Hollywood Hills',
                    observed_at: observedAt,
                    source_url: notice.url,
                    confidence_basis: 'Official HHWNC Website',
                })
                .select();

            if (error) {
                console.error('Insert error:', error);
                results.push({ title: notice.title, status: 'error', error });
            } else {
                results.push({ title: notice.title, status: 'seeded', id: data?.[0]?.id });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
