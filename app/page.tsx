import { supabaseServer } from '@/lib/supabase/server';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

function generateDedupeKey(title: string, date: string): string {
  const parsed = new Date(date);
  const dateStr = isNaN(parsed.getTime()) ? date.replace(/[^a-z0-9]/gi, '').slice(0, 10) : parsed.toISOString().split('T')[0];
  const titleHash = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `${titleHash}_${dateStr}`;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;
  try {
    const query = address.includes('Los Angeles') ? address : `${address}, Los Angeles, CA`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HillsLedger/1.0' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

async function batchGeocode(addresses: string[]): Promise<Map<string, { lat: number; lng: number } | null>> {
  const seen = new Set<string>();
  const unique = addresses.filter(a => { if (seen.has(a)) return false; seen.add(a); return true; });
  const results = new Map<string, { lat: number; lng: number } | null>();
  const BATCH_SIZE = 5;
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(batch.map(geocodeAddress));
    batch.forEach((addr, idx) => results.set(addr, resolved[idx]));
    if (i + BATCH_SIZE < unique.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}

async function fetchDashboardData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Parallel fetch all data sources
  const [
    safetyRes,
    eventsRes,
    aqiRes,
    codeRes,
    newsRes,
    permitsRes,
    roadworkRes,
    legislativeRes,
  ] = await Promise.all([
    supabaseServer
      .from('neighborhood_intel')
      .select('*')
      .eq('category', 'Safety')
      .order('published_at', { ascending: false })
      .limit(10),
    supabaseServer
      .from('events')
      .select('*')
      .eq('is_seed', false)
      .order('observed_at', { ascending: false })
      .limit(10),
    supabaseServer
      .from('neighborhood_intel')
      .select('*')
      .eq('source_name', 'Google AQI')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseServer
      .from('code_enforcement')
      .select('*')
      .eq('status', 'O')
      .order('date_opened', { ascending: false })
      .limit(10),
    fetch(`${baseUrl}/api/news-feed`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { items: [], updated_at: null })
      .catch(() => ({ items: [], updated_at: null })),
    fetch(`${baseUrl}/api/permits`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { permits: [] })
      .catch(() => ({ permits: [] })),
    fetch(`${baseUrl}/api/roadwork`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { friction: [] })
      .catch(() => ({ friction: [] })),
    fetch(`${baseUrl}/api/legislative`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { updates: [] })
      .catch(() => ({ updates: [] })),
  ]);

  const safetyAlerts = safetyRes.data || [];
  const events = eventsRes.data || [];
  const aqiData = aqiRes.data;
  const codeEnforcement = codeRes.data || [];
  const newsData = newsRes;
  const permits = (permitsRes.permits || []).slice(0, 15);
  const roadwork = (roadworkRes.friction || []).slice(0, 10);
  const legislative = (legislativeRes.updates || []).slice(0, 8);

  // Geocode addresses for permits and code enforcement (cached 24h by Next.js fetch)
  const addressesToGeocode = [
    ...codeEnforcement.filter((i: any) => i.address && !i.latitude).map((i: any) => i.address as string),
    ...permits.filter((p: any) => p.address).map((p: any) => p.address as string),
  ];
  const geoCache = addressesToGeocode.length > 0
    ? await batchGeocode(addressesToGeocode.slice(0, 20))
    : new Map<string, { lat: number; lng: number } | null>();

  // Build normalized feed items
  const feedItems: any[] = [];
  const seenKeys = new Set<string>();

  // Safety alerts
  for (const item of safetyAlerts) {
    const key = generateDedupeKey(item.title || '', item.published_at || item.created_at);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    feedItems.push({
      id: item.id,
      type: 'safety',
      severity: item.priority === 1 ? 3 : item.priority === 2 ? 2 : 1,
      title: item.title || 'Safety Alert',
      summary: item.description || '',
      timestamp: item.published_at || item.created_at,
      locationText: item.location || null,
      geo: null,
      sourceName: item.source_name || 'LAFD',
      sourceUrl: item.source_url || (item.url?.startsWith('http') ? item.url : undefined),
      dedupeKey: key,
    });
  }

  // Code enforcement
  for (const item of codeEnforcement) {
    const key = generateDedupeKey(item.case_number || '', item.date_opened || item.created_at);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const existingGeo = (item.lat != null) && (item.lon != null)
      ? { lat: item.lat as number, lng: item.lon as number }
      : null;
    const geocodedGeo = !existingGeo && item.address ? (geoCache.get(item.address) ?? null) : null;

    feedItems.push({
      id: item.id,
      type: 'code',
      severity: 1,
      title: `Case ${item.case_number}`,
      summary: `${item.case_type || 'Code Violation'} • ${item.address || 'Unknown location'}`,
      timestamp: item.date_opened || item.created_at,
      locationText: item.address || null,
      geo: existingGeo ?? geocodedGeo,
      sourceName: 'LA Building & Safety',
      sourceUrl: item.url?.startsWith('http') ? item.url : undefined,
      dedupeKey: key,
    });
  }

  // Events
  for (const item of events) {
    const key = generateDedupeKey(item.event_type || '', item.observed_at || item.created_at);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    feedItems.push({
      id: item.id,
      type: 'event',
      severity: item.impact >= 4 ? 3 : item.impact >= 2 ? 2 : 0,
      title: item.event_type || 'Community Event',
      summary: item.summary || item.description || '',
      timestamp: item.observed_at || item.created_at,
      locationText: item.location_label || null,
      geo: item.lat && item.lng ? { lat: item.lat, lng: item.lng } : null,
      sourceName: 'Community',
      sourceUrl: item.source_url?.startsWith('http') ? item.source_url : undefined,
      dedupeKey: key,
    });
  }

  // Permits
  for (const item of permits) {
    const key = generateDedupeKey(item.permit_number || item.address || '', item.issue_date || new Date().toISOString());
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const valStr = item.valuation ? ` • $${Number(item.valuation).toLocaleString()}` : '';
    const permitGeo = item.address ? (geoCache.get(item.address) ?? null) : null;
    feedItems.push({
      id: `permit-${item.permit_number}`,
      type: 'permit',
      severity: 0,
      title: item.permit_type || 'Building Permit',
      summary: `${item.address}${valStr} — ${item.description || item.status || ''}`.trim(),
      timestamp: item.issue_date || new Date().toISOString(),
      locationText: item.address || null,
      geo: permitGeo,
      sourceName: 'LA Building & Safety',
      sourceUrl: item.zimas_url?.startsWith('http') ? item.zimas_url : undefined,
      dedupeKey: key,
    });
  }

  // Road work
  for (const item of roadwork) {
    const key = generateDedupeKey(item.project_name || '', item.date || new Date().toISOString());
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    feedItems.push({
      id: item.id,
      type: 'street_work',
      severity: item.is_traffic_delay ? 2 : 1,
      title: item.project_name || 'Street Work',
      summary: `${item.street_name} — ${item.work_type}${item.status ? ` • ${item.status}` : ''}`,
      timestamp: new Date().toISOString(),
      locationText: item.street_name || null,
      geo: null,
      sourceName: item.source || 'StreetsLA',
      sourceUrl: undefined,
      dedupeKey: key,
    });
  }

  // Legislative / Government
  for (const item of legislative) {
    const key = generateDedupeKey(item.title || '', item.date || new Date().toISOString());
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    feedItems.push({
      id: item.id,
      type: 'gov',
      severity: 1,
      title: item.title || 'Legislative Update',
      summary: item.summary || '',
      timestamp: new Date().toISOString(),
      locationText: null,
      geo: null,
      sourceName: item.source_name || 'CD4',
      sourceUrl: item.source_url?.startsWith('http') ? item.source_url : undefined,
      dedupeKey: key,
    });
  }

  // Build alert chips (top 3 critical alerts) with proper age formatting
  const criticalAlerts = safetyAlerts.filter((a: any) => a.priority <= 2);
  const alertChips = criticalAlerts
    .slice(0, 3)
    .map((a: any) => {
      // Use formatAge logic inline (avoid import in server component)
      const d = new Date(a.published_at || a.created_at);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      let age: string;
      if (mins < 60) age = `${mins}m`;
      else {
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) age = `${hrs}h`;
        else {
          const days = Math.floor(hrs / 24);
          if (days <= 6) age = `${days}d`;
          else age = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
      }
      return {
        id: a.id,
        icon: a.priority === 1 ? 'flame' : 'alert',
        title: a.title || 'Alert',
        age,
        severity: (a.priority === 1 ? 'critical' : 'warning') as 'critical' | 'warning' | 'info',
      };
    });

  const totalAlertCount = criticalAlerts.length;

  // Build news headlines
  const newsHeadlines = (newsData.items || []).slice(0, 5).map((n: any, i: number) => ({
    id: n.id || `news-${i}`,
    source: n.source || 'News',
    title: n.headline || n.title || '',
    timestamp: n.published || n.published_at || n.pubDate || new Date().toISOString(),
    href: n.url || n.link || '#',
  }));

  // AQI data
  const rawAqi = aqiData?.metadata?.avg_aqi ?? null;
  const aqi = {
    value: rawAqi,
    status: rawAqi === null ? 'N/A' : rawAqi <= 50 ? 'Good' : rawAqi <= 100 ? 'Moderate' : 'Unhealthy',
    updatedAt: aqiData?.created_at || null,
  };

  // Weather from NWS
  let weather: { temp: number; condition: string; high: number; low: number; wind?: string } | undefined;
  try {
    const nwsRes = await fetch('https://api.weather.gov/gridpoints/LOX/152,48/forecast/hourly', {
      headers: { 'User-Agent': '(hills-ledger-app, contact@example.com)' },
      next: { revalidate: 1800 },
    });
    if (nwsRes.ok) {
      const nwsJson = await nwsRes.json();
      const periods = nwsJson.properties?.periods || [];
      const now = new Date();
      const current = periods.find((p: any) => {
        const start = new Date(p.startTime);
        const end = new Date(p.endTime);
        return now >= start && now < end;
      }) || periods[0];
      if (current) {
        const dayPeriods = periods.slice(0, 12);
        const temps = dayPeriods.map((p: any) => p.temperature as number);
        weather = {
          temp: current.temperature,
          condition: current.shortForecast,
          high: Math.max(...temps),
          low: Math.min(...temps),
          wind: current.windSpeed,
        };
      }
    }
  } catch {
    // Weather unavailable — KPIRow handles undefined gracefully
  }

  // Quick stats
  const stats = [
    { label: 'Active Alerts', value: safetyAlerts.length },
    { label: 'Open Cases', value: codeEnforcement.length },
  ];

  return {
    feedItems,
    alertChips,
    totalAlertCount,
    aqi,
    weather,
    stats,
    newsHeadlines,
    newsUpdatedAt: newsData.updated_at,
    openCases: codeEnforcement.length,
  };
}

export default async function Dashboard() {
  const data = await fetchDashboardData();

  return <DashboardClient {...data} />;
}
