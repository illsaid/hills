import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const areaSlug = searchParams.get('area') || 'hollywood-hills';
    const days = parseInt(searchParams.get('days') || '7', 10);
    const eventType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const area = await supabaseServer
      .from('areas')
      .select('id')
      .eq('slug', areaSlug)
      .maybeSingle();

    if (!area.data) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let query = supabaseServer
      .from('events')
      .select('*, source:sources(*)')
      .eq('area_id', area.data.id)
      .eq('is_seed', false)
      .gte('observed_at', cutoffDate.toISOString())
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const result = await query;

    return NextResponse.json({
      events: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
