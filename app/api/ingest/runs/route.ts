import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const areaSlug = searchParams.get('area') || 'hollywood-hills';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const area = await supabaseServer
      .from('areas')
      .select('id')
      .eq('slug', areaSlug)
      .maybeSingle();

    if (!area.data) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    const runs = await supabaseServer
      .from('ingest_runs')
      .select('*, source:sources(name, provider_key)')
      .eq('area_id', area.data.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    return NextResponse.json({
      runs: runs.data || [],
      count: runs.data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
