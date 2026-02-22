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
      .eq('source_name', 'LAPD NIBRS')
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
      console.warn('[security-brief] Supabase query failed:', error.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'security_brief.json');
      if (fs.existsSync(filePath)) {
        console.warn('[security-brief] DEV FALLBACK: serving from data/security_brief.json');
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
