import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { pointInBbox, safeText, safeNumber, safeDate } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

const USER_AGENT = 'hills-ledger/0.1 (contact@example.com)';

export const ladbsProvider: Provider = {
  name: 'ladbs',

  async ingest(context: IngestionContext): Promise<IngestionResult> {
    const { areaId, sourceId, sourceUrl, bbox } = context;
    let fetched = 0;
    let inserted = 0;

    try {
      const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const url = new URL(sourceUrl);
      url.searchParams.set('$limit', '500');
      url.searchParams.set('$order', 'issue_date DESC');
      url.searchParams.set('$where', `issue_date >= '${cutoffStr}'`);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text.slice(0, 200)}`);
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

        const permitType = safeText(
          record.permit_type || record.permit_sub_type || record.work_description || 'Building Permit'
        );
        const permitNumber = safeText(record.permit_nbr || record.permit_number || record.pcis_permit || '');

        const title = `Permit Filed: ${permitType}`.slice(0, 200);
        const summary = permitNumber
          ? `${permitType} permit #${permitNumber} filed for Hollywood Hills property.`
          : `${permitType} permit filed for Hollywood Hills property.`;

        const dateField =
          record.issue_date ||
          record.issued_date ||
          record.date_issued ||
          record.permit_issued_date ||
          record.status_date;
        const occurredAt = safeDate(dateField);

        const impactScore =
          permitType.toLowerCase().includes('foundation') ||
          permitType.toLowerCase().includes('structural') ||
          permitType.toLowerCase().includes('new building')
            ? 2
            : 1;

        events.push({
          event_type: 'PERMIT',
          level: 'INFO',
          verification: 'SINGLE_SOURCE',
          impact: impactScore,
          confidence_basis: 'Geofenced within area boundary',
          title,
          summary: summary.slice(0, 1000),
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
          const insertResult = await supabaseServer.from('events').insert({
            area_id: areaId,
            source_id: sourceId,
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
