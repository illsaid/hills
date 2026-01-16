import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const area = await supabaseServer
      .from('areas')
      .select('slug, name, bbox_min_lat, bbox_max_lat, bbox_min_lng, bbox_max_lng')
      .eq('slug', 'hollywood-hills')
      .single();

    const sourcesResult = await supabaseServer
      .from('sources')
      .select('id, name, provider_key, url, active, reliability')
      .eq('active', true);

    const lastIngestResult = await supabaseServer
      .from('ingest_runs')
      .select('provider, status, finished_at, items_fetched, items_inserted, error')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastEventResult = await supabaseServer
      .from('events')
      .select('observed_at')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const eventCountResult = await supabaseServer
      .from('events')
      .select('id', { count: 'exact', head: true });

    const recentIngestsResult = await supabaseServer
      .from('ingest_runs')
      .select('provider, status, finished_at, items_fetched, items_inserted')
      .order('started_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      ok: true,
      area: area.data,
      sources_active: sourcesResult.data?.length || 0,
      sources: sourcesResult.data || [],
      last_ingest: lastIngestResult.data || null,
      last_event_time: lastEventResult.data?.observed_at || null,
      total_events: eventCountResult.count || 0,
      recent_ingests: recentIngestsResult.data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
