import { Provider, IngestionContext, IngestionResult, IngestionEvent } from '../types';
import { matchesKeywords, findMatchedKeyword, safeText, safeDate, HOLLYWOOD_HILLS_KEYWORDS } from '../utils';
import { supabaseServer } from '@/lib/supabase/server';

export const lafdProvider: Provider = {
  name: 'lafd',

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
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();

      const items = parseRSSItems(xmlText);
      fetched = items.length;

      const events: IngestionEvent[] = [];

      for (const item of items) {
        const title = safeText(item.title);
        const description = safeText(item.description);
        const fullText = `${title} ${description}`;

        if (!matchesKeywords(fullText, HOLLYWOOD_HILLS_KEYWORDS)) {
          continue;
        }

        const matchedKeyword = findMatchedKeyword(fullText, HOLLYWOOD_HILLS_KEYWORDS);

        const isCritical = /evacuation|evacuate|immediate threat/i.test(fullText);
        const level = isCritical ? 'CRITICAL' : 'ADVISORY';

        let impact = 2;
        if (isCritical) impact = 4;
        else if (/major|significant|large/i.test(fullText)) impact = 3;

        events.push({
          event_type: 'FIRE',
          level,
          verification: 'SINGLE_SOURCE',
          impact,
          confidence_basis: `Keyword match: ${matchedKeyword}`,
          title,
          summary: description,
          location_label: `${matchedKeyword} vicinity`,
          lat: null,
          lng: null,
          occurred_at: safeDate(item.pubDate),
          observed_at: new Date(),
          source_url: safeText(item.link) || null,
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

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function parseRSSItems(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const itemContent = itemMatch[1];

    const title = extractTag(itemContent, 'title');
    const description = extractTag(itemContent, 'description');
    const link = extractTag(itemContent, 'link');
    const pubDate = extractTag(itemContent, 'pubDate');

    if (title) {
      items.push({ title, description, link, pubDate });
    }
  }

  return items;
}

function extractTag(content: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = content.match(regex);
  if (match && match[1]) {
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return '';
}
