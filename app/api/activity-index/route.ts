import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ACTIVITY_SOURCE_NAMES = ['LAPD Activity', 'Activity Index', 'LAPD Calls for Service', 'LAPD NIBRS'];

export async function GET() {
  try {
    let result = null;

    for (const sourceName of ACTIVITY_SOURCE_NAMES) {
      const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('raw_json, published_at, snapshot, source_name')
        .eq('source_name', sourceName)
        .in('category', ['Safety', 'Activity'])
        .gte('published_at', cutoffDate(DATA_CUTOFFS.ACTIVITY))
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.raw_json) {
        result = data;
        break;
      }
    }

    if (result?.raw_json) {
      return NextResponse.json({
        ...(result.raw_json as Record<string, unknown>),
        snapshot: result.snapshot ?? false,
        snapshot_updated_at: result.published_at ?? null,
        data_source: result.source_name,
      });
    }

    const { data: fallbackData } = await supabase
      .from('neighborhood_intel')
      .select('raw_json, published_at, snapshot, source_name')
      .in('category', ['Safety', 'Activity'])
      .not('raw_json', 'is', null)
      .gte('published_at', cutoffDate(DATA_CUTOFFS.ACTIVITY))
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackData?.raw_json) {
      return NextResponse.json({
        ...(fallbackData.raw_json as Record<string, unknown>),
        snapshot: fallbackData.snapshot ?? true,
        snapshot_updated_at: fallbackData.published_at ?? null,
        data_source: fallbackData.source_name,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'activity_index.json');
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ ...fileData, snapshot: true, snapshot_updated_at: fileData.updated_at });
      }
    }

    return NextResponse.json({
      activity_status: 'PENDING',
      brief_text: 'Activity index pending generation.',
      updated_at: new Date().toISOString(),
      total_calls: 0,
      call_breakdown: {},
      snapshot: false,
      snapshot_updated_at: null,
    });
  } catch (err) {
    console.error('[activity-index] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load activity index' }, { status: 500 });
  }
}
