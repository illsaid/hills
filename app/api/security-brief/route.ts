import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SECURITY_SOURCE_NAMES = ['LAPD NIBRS', 'Security Brief', 'LAPD Activity', 'LAPD Calls for Service'];

export async function GET() {
  try {
    let result = null;

    for (const sourceName of SECURITY_SOURCE_NAMES) {
      const { data, error } = await supabase
        .from('neighborhood_intel')
        .select('raw_json, published_at, snapshot, source_name')
        .eq('source_name', sourceName)
        .eq('category', 'Safety')
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
      .select('raw_json, published_at, snapshot, source_name, title, description')
      .eq('category', 'Safety')
      .not('raw_json', 'is', null)
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
      const filePath = path.join(process.cwd(), 'data', 'security_brief.json');
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ ...fileData, snapshot: true, snapshot_updated_at: fileData.updated_at });
      }
    }

    return NextResponse.json({
      status: 'NORMAL',
      brief_text: 'Security brief pending generation.',
      updated_at: new Date().toISOString(),
      stats: { total: 0, wow_change: 0, yoy_change: 0 },
      snapshot: false,
      snapshot_updated_at: null,
    });
  } catch (err) {
    console.error('[security-brief] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load security brief' }, { status: 500 });
  }
}
