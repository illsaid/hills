import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { providers } from '@/lib/ingest';
import { HOLLYWOOD_HILLS_KEYWORDS } from '@/lib/ingest/utils';

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
      .single();

    if (!area.data) {
      return NextResponse.json({ error: `Area not found: ${areaSlug}` }, { status: 404 });
    }

    const source = await supabaseServer
      .from('sources')
      .select('*')
      .eq('area_id', area.data.id)
      .eq('provider_key', providerName)
      .single();

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
      if (providerName === 'lafd') {
        const response = await fetch(sourceUrl, {
          headers: {
            'User-Agent': 'hills-ledger/0.1 (contact@example.com)',
            'Accept': 'text/html',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const alerts = parseHTMLAlertsForDebug(html, sourceUrl);
        fetchedCount = alerts.length;
        rawSample = alerts.slice(0, 2);
        parsedSample = alerts.slice(0, 3).map(alert => ({
          title: alert.title,
          summary: alert.summary.slice(0, 200),
          datetime: alert.datetime,
          location: extractLocationLabel(alert.neighborhood),
        }));
      } else if (providerName === 'nws') {
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

function parseHTMLAlertsForDebug(html: string, baseUrl: string) {
  const alerts: any[] = [];
  const sectionRegex = /<h[23][^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>\s*<\/h[23]>\s*<p[^>]*>(.*?)<\/p>/gis;
  let match;

  while ((match = sectionRegex.exec(html)) !== null) {
    const href = match[1];
    const titleRaw = match[2];
    const bodyRaw = match[3];

    const title = stripHTML(titleRaw).trim();
    const body = stripHTML(bodyRaw).trim();

    if (!title || title.length < 5) continue;

    const summary = body.split(/[.!?]/).slice(0, 2).join('. ').trim() || title;
    const dateMatch = title.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const datetime = dateMatch ? dateMatch[1] : null;
    const neighborhoodMatch = body.match(/#(\w+)/);
    const neighborhood = neighborhoodMatch ? neighborhoodMatch[1] : 'HollywoodHills';
    const url = href.startsWith('http') ? href : (href.startsWith('/') ? `https://lafd.org${href}` : baseUrl);

    alerts.push({ title, summary, datetime, url, neighborhood });
  }

  if (alerts.length === 0) {
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gis;
    let h2Match;
    let count = 0;

    while ((h2Match = h2Regex.exec(html)) !== null && count < 10) {
      const titleContent = stripHTML(h2Match[1]).trim();
      if (titleContent.length > 10 && /fire|incident|alert|emergency|brush|structure/i.test(titleContent)) {
        alerts.push({
          title: titleContent,
          summary: titleContent,
          datetime: null,
          url: baseUrl,
          neighborhood: 'HollywoodHills',
        });
        count++;
      }
    }
  }

  return alerts;
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLocationLabel(neighborhood: string): string {
  const lower = neighborhood.toLowerCase();
  if (lower.includes('hollywoodhillswest')) return 'Hollywood Hills West';
  if (lower.includes('hollywoodhills')) return 'Hollywood Hills';
  if (lower.includes('laurelcanyon')) return 'Laurel Canyon';
  if (lower.includes('mulholland')) return 'Mulholland Drive area';
  return 'Hollywood Hills vicinity';
}
