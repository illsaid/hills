import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('neighborhood_intel')
      .select('title, description, url, published_at, source_name, category')
      .eq('category', 'News Feed')
      .not('title', 'is', null)
      .or(`published_at.gte.${cutoffDate(DATA_CUTOFFS.NEWS)},published_at.is.null`)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      const items = data.map(r => ({
        headline: r.title,
        source: r.source_name ?? 'Google News',
        url: r.url,
        published: r.published_at,
        summary: r.description,
        keyword_match: 'Query Match',
      }));
      return NextResponse.json({
        items,
        updated_at: data[0].published_at,
        snapshot: false,
        snapshot_updated_at: data[0].published_at ?? null,
      });
    }

    if (error) {
      console.warn('[news-feed] Supabase query failed:', error.message);
    }

    return NextResponse.json({ items: [], updated_at: null, snapshot: false, snapshot_updated_at: null });
  } catch (err) {
    console.error('[news-feed] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load news feed' }, { status: 500 });
  }
}
