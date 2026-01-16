import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { matchesKeywords, safeText, safeDate, HOLLYWOOD_HILLS_KEYWORDS } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

export const nwsProvider: Provider = {
  name: 'nws',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId } = context;
    let fetched = 0;
    let inserted = 0;

    try {
      const source = await supabaseServer
        .from('sources')
        .select('url')
        .eq('id', sourceId)
        .single();

      if (!source.data) {
        throw new Error('Source not found');
      }

      const response = await fetch(source.data.url, {
        headers: {
          'User-Agent': 'The-Hills-Ledger/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const features = data.features || [];
      fetched = features.length;

      const events: IngestionEvent[] = [];

      for (const feature of features) {
        const properties = feature.properties || {};
        const event = safeText(properties.event);
        const headline = safeText(properties.headline);
        const description = safeText(properties.description);
        const severity = safeText(properties.severity);
        const areaDesc = safeText(properties.areaDesc);

        const fullText = `${event} ${headline} ${description} ${areaDesc}`;

        const isLosAngelesRelated = /los angeles/i.test(fullText);
        const matchesHollywoodHills = matchesKeywords(fullText, HOLLYWOOD_HILLS_KEYWORDS);

        if (!isLosAngelesRelated && !matchesHollywoodHills) {
          continue;
        }

        let level: 'INFO' | 'ADVISORY' | 'CRITICAL' = 'INFO';
        let impact = 1;

        if (severity === 'Extreme') {
          level = 'CRITICAL';
          impact = 5;
        } else if (severity === 'Severe' || /warning/i.test(event)) {
          level = 'CRITICAL';
          impact = 4;
        } else if (/advisory|watch/i.test(event)) {
          level = 'ADVISORY';
          impact = 3;
        } else {
          level = 'INFO';
          impact = 2;
        }

        const locationLabel = matchesHollywoodHills
          ? 'Hollywood Hills area'
          : 'Los Angeles region';

        const confidenceBasis = matchesHollywoodHills
          ? 'Specific area mention'
          : 'Los Angeles County coverage';

        events.push({
          event_type: 'WEATHER',
          level,
          verification: 'VERIFIED',
          impact,
          confidence_basis: confidenceBasis,
          title: event || headline,
          summary: description || headline,
          location_label: locationLabel,
          lat: null,
          lng: null,
          occurred_at: safeDate(properties.onset) || safeDate(properties.sent),
          observed_at: new Date(),
          source_url: safeText(properties.id) || null,
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
          await supabaseServer.from('events').insert({
            area_id: areaId,
            source_id: sourceId,
            ...event,
          });
          inserted++;
        }
      }

      return { fetched, inserted };
    } catch (error: any) {
      return { fetched, inserted, error: error.message };
    }
  },
};
