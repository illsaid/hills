/**
 * InsureTrack Adapter (Placeholder)
 * 
 * Future integration: Track insurance claims, fire zones, and risk data.
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';

export const insureTrackAdapter: ModuleAdapter = {
    id: 'insuretrack',
    title: 'InsureTrack',
    icon: 'shield',

    async discoverSchema(): Promise<SchemaDiscovery> {
        console.log('[insureTrackAdapter] Schema discovery not implemented yet');
        return { keys: [], sample: null };
    },

    async getSummary(_params: AddressParams): Promise<ModuleSummary> {
        return {
            newCount: 0,
            headlineMetric: 'Coming soon',
            topTag: undefined,
        };
    },

    async getItems(_params: AddressParams): Promise<IntelEvent[]> {
        return [];
    },
};
