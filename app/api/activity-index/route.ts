import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('neighborhood_intel')
      .select('raw_json, published_at, snapshot')
      .eq('source_name', 'LAPD Activity')
      .eq('category', 'Safety')
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
      console.warn('[activity-index] Supabase query failed:', error.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'activity_index.json');
      if (fs.existsSync(filePath)) {
        console.warn('[activity-index] DEV FALLBACK: serving from data/activity_index.json');
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
