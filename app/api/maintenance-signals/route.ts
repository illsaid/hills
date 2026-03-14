import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'maintenance_signals.json');
      if (fs.existsSync(filePath)) {
        console.warn('[maintenance-signals] DEV FALLBACK: serving from data/maintenance_signals.json');
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ ...fileData, snapshot: true, snapshot_updated_at: fileData.updated_at });
      }
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
