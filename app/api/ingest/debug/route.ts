import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { providers } from '@/lib/ingest';
import { HOLLYWOOD_HILLS_KEYWORDS } from '@/lib/ingest/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerName = searchParams.get('provider');
    const areaSlug = searchParams.get('area') || 'hollywood-hills';

    if (!providerName) {
      return NextResponse.json({ error: 'Provider parameter required' }, { status: 400 });
    }

    const provider = providers[providerName];
    if (!provider) {
      return NextResponse.json({ error: `Unknown provider: ${providerName}` }, { status: 400 });
    }

    const area = await supabaseServer
      .from('areas')
      .select('*')
      .eq('slug', areaSlug)
      .maybeSingle();

    if (!area.data) {
      return NextResponse.json({ error: `Area not found: ${areaSlug}` }, { status: 404 });
    }

    const source = await supabaseServer
      .from('sources')
      .select('*')
      .eq('area_id', area.data.id)
      .eq('provider_key', providerName)
      .maybeSingle();

    if (source.error || !source.data) {
      return NextResponse.json({
        error: `Source not found for provider_key '${providerName}' in area '${areaSlug}'`,
        details: source.error?.message,
      }, { status: 404 });
    }

    const sourceUrl = source.data.url;
    const fetchedAt = new Date().toISOString();

    let rawSample: any[] = [];
    let parsedSample: any[] = [];
    let fetchedCount = 0;
    let error: string | null = null;

    try {
      if (providerName === 'nws') {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'hills-ledger/0.1 (contact@example.com)',
            'Accept': 'application/geo+json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const features = data.features || [];
        fetchedCount = features.length;
        rawSample = features.slice(0, 2);
        parsedSample = features.slice(0, 3).map((f: any) => ({
          event: f.properties?.event,
          severity: f.properties?.severity,
          areaDesc: f.properties?.areaDesc,
          headline: f.properties?.headline,
        }));
      } else if (providerName === 'ladbs') {
        const url = new URL(sourceUrl);
        url.searchParams.set('$limit', '100');
        url.searchParams.set('$order', 'issue_date DESC');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'hills-ledger/0.1 (contact@example.com)',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const records = await response.json();
        fetchedCount = Array.isArray(records) ? records.length : 0;
        rawSample = Array.isArray(records) ? records.slice(0, 2) : [];
        parsedSample = Array.isArray(records) ? records.slice(0, 3).map((r: any) => ({
          permit_type: r.permit_type,
          permit_number: r.permit_nbr,
          issue_date: r.issue_date,
          has_location: !!(r.latitude && r.longitude),
        })) : [];
      }
    } catch (err: any) {
      error = err.message;
    }

    return NextResponse.json({
      ok: !error,
      provider: providerName,
      area: areaSlug,
      source_url: sourceUrl,
      fetched_at: fetchedAt,
      fetched_count: fetchedCount,
      parsed_sample: parsedSample,
      raw_sample: rawSample,
      error,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


