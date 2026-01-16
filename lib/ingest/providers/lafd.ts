import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { safeDate } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

const USER_AGENT = 'hills-ledger/0.1 (contact@example.com)';
const MAX_PAGES = 5;
const CUTOFF_DAYS = 90;

export const lafdProvider: Provider = {
  name: 'lafd',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId, sourceUrl } = context;
    let fetched = 0;
    let inserted = 0;

    try {
      const cutoffDate = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);
      const allAlerts: LAFDAlert[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const url = page === 0 ? sourceUrl : `${sourceUrl}&page=${page}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html',
          },
        });

        if (!response.ok) {
          if (page === 0) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          break;
        }

        const html = await response.text();
        const alerts = parseHTMLAlerts(html, sourceUrl);

        if (alerts.length === 0) {
          break;
        }

        allAlerts.push(...alerts);

        const oldestDate = alerts.reduce((oldest, alert) => {
          if (!alert.datetime) return oldest;
          return alert.datetime < oldest ? alert.datetime : oldest;
        }, new Date());

        if (oldestDate < cutoffDate) {
          break;
        }
      }

      fetched = allAlerts.length;

      const events: IngestionEvent[] = [];

      for (const alert of allAlerts) {
        const title = alert.title;
        const summary = alert.summary;
        const fullText = `${title} ${summary}`;

        const isCritical = /evacuation|evacuate|fatality|immediate threat/i.test(fullText);
        const isFire = /fire|brush|structure/i.test(title);
        const isTraffic = /traffic|collision|vehicle/i.test(title);
        const isDebrisFlow = /debris flow|mudslide/i.test(title);

        let eventType: 'FIRE' | 'CLOSURE' | 'OTHER' = 'OTHER';
        if (isFire) {
          eventType = 'FIRE';
        } else if (isTraffic || isDebrisFlow) {
          eventType = 'CLOSURE';
        }

        let level: 'INFO' | 'ADVISORY' | 'CRITICAL' = 'INFO';
        if (isCritical) {
          level = 'CRITICAL';
        } else if (isFire) {
          level = 'ADVISORY';
        }

        let impact = 1;
        if (isCritical) impact = 4;
        else if (isFire && /major|large|significant/i.test(fullText)) impact = 3;
        else if (isFire) impact = 2;

        const locationLabel = extractLocationLabel(alert.neighborhood);

        events.push({
          event_type: eventType,
          level,
          verification: 'SINGLE_SOURCE',
          impact,
          confidence_basis: `LAFD filtered by ${alert.neighborhood}`,
          title,
          summary: summary.slice(0, 1000),
          location_label: locationLabel,
          lat: null,
          lng: null,
          occurred_at: alert.datetime || new Date(),
          observed_at: new Date(),
          source_url: alert.url,
        });
      }

      for (const event of events) {
        const exists = await supabaseServer
          .from('events')
          .select('id')
          .eq('source_id', sourceId)
          .eq('title', event.title)
          .gte('observed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!exists.data) {
          const insertResult = await supabaseServer.from('events').insert({
            area_id: areaId,
            source_id: sourceId,
            is_seed: false,
            ...event,
          });
          if (!insertResult.error) {
            inserted++;
          }
        }
      }

      return { fetched, inserted };
    } catch (error: any) {
      return { fetched, inserted, error: error.message };
    }
  },
};

interface LAFDAlert {
  title: string;
  summary: string;
  datetime: Date | null;
  url: string | null;
  neighborhood: string;
}

function parseHTMLAlerts(html: string, baseUrl: string): LAFDAlert[] {
  const alerts: LAFDAlert[] = [];

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
    let datetime: Date | null = null;
    if (dateMatch) {
      datetime = safeDate(dateMatch[1]);
    }
    if (!datetime) {
      const bodyDateMatch = body.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (bodyDateMatch) {
        datetime = safeDate(bodyDateMatch[1]);
      }
    }

    const neighborhoodMatch = body.match(/#(\w+)/);
    const neighborhood = neighborhoodMatch ? neighborhoodMatch[1] : 'HollywoodHills';

    const url = href.startsWith('http') ? href : (href.startsWith('/') ? `https://lafd.org${href}` : baseUrl);

    alerts.push({
      title,
      summary,
      datetime: datetime || new Date(),
      url,
      neighborhood,
    });
  }

  if (alerts.length === 0) {
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gis;
    let h2Match;
    let count = 0;

    while ((h2Match = h2Regex.exec(html)) !== null && count < 10) {
      const titleContent = stripHTML(h2Match[1]).trim();
      const titleClean = titleContent.replace(/<[^>]*>/g, '').trim();

      if (titleClean.length > 10 && /fire|incident|alert|emergency|brush|structure/i.test(titleClean)) {
        alerts.push({
          title: titleClean,
          summary: titleClean,
          datetime: new Date(),
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

  if (lower.includes('hollywoodhillswest')) {
    return 'Hollywood Hills West';
  } else if (lower.includes('hollywoodhills')) {
    return 'Hollywood Hills';
  } else if (lower.includes('laurelcanyon')) {
    return 'Laurel Canyon';
  } else if (lower.includes('mulholland')) {
    return 'Mulholland Drive area';
  } else {
    return 'Hollywood Hills vicinity';
  }
}
