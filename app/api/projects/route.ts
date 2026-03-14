import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const areaSlug = searchParams.get('area') || 'hollywood-hills';
    const days = parseInt(searchParams.get('days') || '30', 10);
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

    const result = await supabaseServer
      .from('projects')
      .select('*')
      .eq('area_id', area.data.id)
      .gte('last_activity_at', cutoffDate.toISOString())
      .order('last_activity_at', { ascending: false })
      .limit(limit);

    return NextResponse.json({
      projects: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
