import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { matchesKeywords, safeText, safeDate } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

const USER_AGENT = 'hills-ledger/0.1 (contact@example.com)';

export const nwsProvider: Provider = {
  name: 'nws',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId, sourceUrl, keywords } = context;
    let fetched = 0;
    let inserted = 0;

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/geo+json',
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      const features = data.features || [];
      fetched = features.length;

      const events: IngestionEvent[] = [];

      for (const feature of features) {
        const properties = feature.properties || {};
        const eventName = safeText(properties.event);
        const headline = safeText(properties.headline);
        const description = safeText(properties.description);
        const severity = safeText(properties.severity);
        const areaDesc = safeText(properties.areaDesc);

        const fullText = `${eventName} ${headline} ${description} ${areaDesc}`;

        const isLosAngelesRelated = /los angeles|la county/i.test(fullText);
        const matchesHillsKeywords = matchesKeywords(fullText, keywords);

        if (!isLosAngelesRelated && !matchesHillsKeywords) {
          continue;
        }

        let level: 'INFO' | 'ADVISORY' | 'CRITICAL' = 'INFO';
        let impact = 1;

        if (severity === 'Extreme') {
          level = 'CRITICAL';
          impact = 5;
        } else if (severity === 'Severe' || /warning/i.test(eventName)) {
          level = 'CRITICAL';
          impact = 4;
        } else if (/advisory|watch/i.test(eventName)) {
          level = 'ADVISORY';
          impact = 3;
        } else {
          level = 'INFO';
          impact = 2;
        }

        const locationLabel = matchesHillsKeywords
          ? 'Hollywood Hills area'
          : 'Los Angeles region';

        const confidenceBasis = matchesHillsKeywords
          ? 'Keyword match in alert'
          : 'Los Angeles County coverage';

        events.push({
          event_type: 'WEATHER',
          level,
          verification: 'VERIFIED',
          impact,
          confidence_basis: confidenceBasis,
          title: eventName || headline || 'Weather Alert',
          summary: (description || headline || '').slice(0, 1000),
          location_label: locationLabel,
          lat: null,
          lng: null,
          occurred_at: safeDate(properties.onset) || safeDate(properties.sent),
          observed_at: new Date(),
          source_url: safeText(properties['@id']) || safeText(properties.id) || null,
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
