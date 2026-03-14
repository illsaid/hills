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
      .select('title, description, url, published_at, snapshot, raw_json, source_name')
      .eq('category', 'News Feed')
      .gte('published_at', cutoffDate(DATA_CUTOFFS.NEWS))
      .order('published_at', { ascending: false })
      .limit(20);

    if (!error && data && data.length > 0) {
      const anySnapshot = data.some(r => r.snapshot);
      const items = data.map(r => ({
        headline: r.title,
        source: (r.raw_json as Record<string, unknown>)?.source ?? r.source_name ?? 'Local News',
        url: r.url,
        published: r.published_at,
        summary: r.description,
        keyword_match: 'Query Match',
      }));
      return NextResponse.json({
        items,
        updated_at: data[0].published_at,
        snapshot: anySnapshot,
        snapshot_updated_at: data[0].published_at ?? null,
      });
    }

    if (error) {
      console.warn('[news-feed] Supabase query failed:', error.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'news_feed.json');
      if (fs.existsSync(filePath)) {
        console.warn('[news-feed] DEV FALLBACK: serving from data/news_feed.json');
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return NextResponse.json({ ...fileData, snapshot: true, snapshot_updated_at: fileData.updated_at });
      }
    }

    return NextResponse.json({ items: [], updated_at: null, snapshot: false, snapshot_updated_at: null });
  } catch (err) {
    console.error('[news-feed] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load news feed' }, { status: 500 });
  }
}
