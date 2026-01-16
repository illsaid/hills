import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const area = await supabaseServer
      .from('areas')
      .select('slug, name')
      .eq('slug', 'hollywood-hills')
      .single();

    const sourcesResult = await supabaseServer
      .from('sources')
      .select('id, name, active')
      .eq('active', true);

    const lastIngestResult = await supabaseServer
      .from('ingest_runs')
      .select('provider, status, finished_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastUpdateResult = await supabaseServer
      .from('events')
      .select('observed_at')
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      area: area.data,
      sources_active: sourcesResult.data?.length || 0,
      last_ingest: lastIngestResult.data || null,
      last_update: lastUpdateResult.data?.observed_at || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
