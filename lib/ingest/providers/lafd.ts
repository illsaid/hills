import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { safeText, safeDate } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

const USER_AGENT = 'hills-ledger/0.1 (contact@example.com)';

export const lafdProvider: Provider = {
  name: 'lafd',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId, sourceUrl } = context;
    let fetched = 0;
    let inserted = 0;

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text.slice(0, 200)}`);
      }

      const html = await response.text();
      const alerts = parseHTMLAlerts(html, sourceUrl);
      fetched = alerts.length;

      const events: IngestionEvent[] = [];

      for (const alert of alerts) {
        const title = alert.title;
        const summary = alert.summary;
        const fullText = `${title} ${summary}`;

        const isCritical = /evacuation|evacuate|fatality|immediate threat/i.test(fullText);
        const isFire = /fire|brush|structure/i.test(title);
        const isTraffic = /traffic|collision|vehicle/i.test(title);

        let eventType: 'FIRE' | 'CLOSURE' | 'OTHER' = 'OTHER';
        if (isFire) {
          eventType = 'FIRE';
        } else if (isTraffic) {
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
          occurred_at: alert.datetime,
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

  const alertBlockRegex = /<article[^>]*class="[^"]*alert-item[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = alertBlockRegex.exec(html)) !== null) {
    const blockHtml = match[1];

    const titleMatch = blockHtml.match(/<h[234][^>]*class="[^"]*alert-title[^"]*"[^>]*>([\s\S]*?)<\/h[234]>/i) ||
                       blockHtml.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/i);
    const title = titleMatch ? stripHTML(titleMatch[1]).trim() : '';

    const summaryMatch = blockHtml.match(/<p[^>]*class="[^"]*alert-summary[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                         blockHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const summaryRaw = summaryMatch ? stripHTML(summaryMatch[1]).trim() : '';
    const summary = summaryRaw.split(/[.!?]/).slice(0, 2).join('. ').trim();

    const datetimeMatch = blockHtml.match(/<time[^>]*datetime="([^"]+)"/i) ||
                          blockHtml.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2})/);
    const datetime = datetimeMatch ? safeDate(datetimeMatch[1]) : new Date();

    const linkMatch = blockHtml.match(/<a[^>]*href="([^"]+)"/i);
    const url = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : null) : baseUrl;

    const neighborhoodMatch = blockHtml.match(/#([A-Za-z]+)/);
    const neighborhood = neighborhoodMatch ? neighborhoodMatch[1] : 'HollywoodHills';

    if (title) {
      alerts.push({
        title,
        summary: summary || title,
        datetime,
        url,
        neighborhood,
      });
    }
  }

  if (alerts.length === 0) {
    const fallbackTitleRegex = /<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi;
    let titleMatch;
    let count = 0;

    while ((titleMatch = fallbackTitleRegex.exec(html)) !== null && count < 10) {
      const title = stripHTML(titleMatch[1]).trim();
      if (title.length > 10 && /fire|incident|alert|emergency/i.test(title)) {
        alerts.push({
          title,
          summary: title,
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
