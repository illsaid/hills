import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('neighborhood_intel')
      .select('raw_json, title, description, published_at, snapshot')
      .in('source_name', ['LAFD Alerts', 'LAFD Alert'])
      .eq('category', 'Safety')
      .gte('published_at', cutoffDate(DATA_CUTOFFS.PULSE))
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      if (data.raw_json) {
        return NextResponse.json({
          ...(data.raw_json as Record<string, unknown>),
          snapshot: data.snapshot ?? false,
          snapshot_updated_at: data.published_at ?? null,
        });
      }
      // raw_json is null — build response from title/description fields
      return NextResponse.json({
        status: 'Active',
        summary: data.description || data.title || 'Active alert detected.',
        last_updated: data.published_at,
        alerts: data.title ? [{ title: data.title, description: data.description }] : [],
        snapshot: data.snapshot ?? false,
        snapshot_updated_at: data.published_at ?? null,
      });
    }

    if (error) {
      console.warn('[pulse] Supabase query failed:', error.message);
    }

    return NextResponse.json({
      status: 'Pending',
      summary: 'Alert monitor pending data.',
      alerts: [],
      snapshot: false,
      snapshot_updated_at: null,
    });
  } catch (err) {
    console.error('[pulse] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load pulse data' }, { status: 500 });
  }
}
