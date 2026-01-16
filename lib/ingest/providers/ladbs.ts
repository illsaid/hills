import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { pointInBbox, safeText, safeNumber, safeDate } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

export const ladbsProvider: Provider = {
  name: 'ladbs',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId, bbox } = context;
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

      const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const url = new URL(source.data.url);
      url.searchParams.set('$limit', '200');
      url.searchParams.set('$order', 'issue_date DESC');
      url.searchParams.set('$where', `issue_date >= '${cutoffStr}'`);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'The-Hills-Ledger/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const records = await response.json();
      fetched = Array.isArray(records) ? records.length : 0;

      const events: IngestionEvent[] = [];

      for (const record of records) {
        let lat: number | null = null;
        let lng: number | null = null;

        if (record.latitude && record.longitude) {
          lat = safeNumber(record.latitude);
          lng = safeNumber(record.longitude);
        } else if (record.location) {
          if (record.location.latitude && record.location.longitude) {
            lat = safeNumber(record.location.latitude);
            lng = safeNumber(record.location.longitude);
          } else if (record.location.coordinates) {
            lng = safeNumber(record.location.coordinates[0]);
            lat = safeNumber(record.location.coordinates[1]);
          }
        }

        if (!lat || !lng || !pointInBbox(lat, lng, bbox)) {
          continue;
        }

        const permitType = safeText(record.permit_type || record.permit_sub_type || 'Permit');
        const permitNumber = safeText(record.permit_nbr || record.permit_number || '');

        const title = `Permit Filed: ${permitType}`;
        const summary = permitNumber
          ? `${permitType} permit ${permitNumber} filed for Hollywood Hills property.`
          : `${permitType} permit filed for Hollywood Hills property.`;

        const dateField = record.issue_date || record.issued_date || record.date_issued || record.permit_issued_date;
        const occurredAt = safeDate(dateField);

        events.push({
          event_type: 'PERMIT',
          level: 'INFO',
          verification: 'SINGLE_SOURCE',
          impact: permitType.toLowerCase().includes('foundation') || permitType.toLowerCase().includes('structural') ? 2 : 1,
          confidence_basis: 'Geofenced within area boundary',
          title,
          summary,
          location_label: 'Hollywood Hills area',
          lat,
          lng,
          occurred_at: occurredAt,
          observed_at: new Date(),
          source_url: null,
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
