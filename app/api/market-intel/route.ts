import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('neighborhood_intel')
      .select('raw_json, published_at, snapshot')
      .eq('source_name', 'ULA Market Data')
      .eq('category', 'Housing')
      .gte('published_at', cutoffDate(DATA_CUTOFFS.MARKET))
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.raw_json) {
      return NextResponse.json({
        ...(data.raw_json as Record<string, unknown>),
        snapshot: data.snapshot ?? true,
        snapshot_updated_at: data.published_at ?? null,
      });
    }

    if (error) {
      console.warn('[market-intel] Supabase query failed:', error.message);
    }

    return NextResponse.json({
      quarter: 'Pending',
      generated_revenue: 0,
      transaction_count: 0,
      context: 'Market intelligence pending generation.',
      snapshot: true,
      snapshot_updated_at: null,
    });
  } catch (err) {
    console.error('[market-intel] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load market intel' }, { status: 500 });
  }
}
