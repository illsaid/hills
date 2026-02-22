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
      .eq('source_name', 'LAFD Alerts')
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
      console.warn('[pulse] Supabase query failed:', error.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'intelligence_pulse.json');
      if (fs.existsSync(filePath)) {
        console.warn('[pulse] DEV FALLBACK: serving from data/intelligence_pulse.json');
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ ...fileData, snapshot: true, snapshot_updated_at: fileData.last_updated });
      }
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
