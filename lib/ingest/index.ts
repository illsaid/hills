import { Provider, IngestionContext, IngestionResult } from './types';
// lafd provider removed
import { nwsProvider } from './providers/nws';
import { ladbsProvider } from './providers/ladbs';
import { supabaseServer } from '@/lib/supabase/server';
import { HOLLYWOOD_HILLS_KEYWORDS } from './utils';

const providers: Record<string, Provider> = {
  nws: nwsProvider,
  ladbs: ladbsProvider,
};

export async function runProvider(
  providerName: string,
  areaSlug: string
): Promise<IngestionResult> {
  const provider = providers[providerName];
  if (!provider) {
    return {
      fetched: 0,
      inserted: 0,
      error: `Unknown provider: ${providerName}`,
    };
  }

  const area = await supabaseServer
    .from('areas')
    .select('*')
    .eq('slug', areaSlug)
    .single();

  if (!area.data) {
    return {
      fetched: 0,
      inserted: 0,
      error: `Area not found: ${areaSlug}`,
    };
  }

  const source = await supabaseServer
    .from('sources')
    .select('*')
    .eq('area_id', area.data.id)
    .eq('provider_key', providerName)
    .single();

  if (source.error || !source.data) {
    return {
      fetched: 0,
      inserted: 0,
      error: `Source not found for provider_key '${providerName}' in area '${areaSlug}': ${source.error?.message || 'no data'}`,
    };
  }

  const runId = crypto.randomUUID();
  await supabaseServer.from('ingest_runs').insert({
    id: runId,
    area_id: area.data.id,
    source_id: source.data.id,
    provider: providerName,
    status: 'RUNNING',
  });

  const context: IngestionContext = {
    areaId: area.data.id,
    sourceId: source.data.id,
    sourceUrl: source.data.url,
    bbox: {
      min_lat: area.data.bbox_min_lat,
      max_lat: area.data.bbox_max_lat,
      min_lng: area.data.bbox_min_lng,
      max_lng: area.data.bbox_max_lng,
    },
    keywords: HOLLYWOOD_HILLS_KEYWORDS,
  };

  const result = await provider.ingest(context);

  await supabaseServer
    .from('ingest_runs')
    .update({
      status: result.error ? 'ERROR' : 'SUCCESS',
      finished_at: new Date().toISOString(),
      items_fetched: result.fetched,
      items_inserted: result.inserted,
      error: result.error || null,
    })
    .eq('id', runId);

  return result;
}

export { providers };
