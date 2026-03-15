import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('neighborhood_intel')
      .select('raw_json, published_at, snapshot')
      .eq('source_name', 'LA 311')
      .eq('category', 'Maintenance')
      .gte('published_at', cutoffDate(DATA_CUTOFFS.MAINTENANCE))
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.raw_json) {
      return NextResponse.json({
        ...(data.raw_json as Record<string, unknown>),
        snapshot: data.snapshot ?? false,
        snapshot_updated_at: data.published_at ?? null,
      });
    }

    if (error) {
      console.warn('[maintenance-signals] Supabase query failed:', error.message);
    }

    return NextResponse.json({
      period: 'Last 30 Days',
      total_requests: 0,
      top_types: [],
      hotspots: [],
      status: 'Pending Generation',
      snapshot: false,
      snapshot_updated_at: null,
    });
  } catch (err) {
    console.error('[maintenance-signals] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load maintenance signals' }, { status: 500 });
  }
}
