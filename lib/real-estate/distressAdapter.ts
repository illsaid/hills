/**
 * Distress Adapter (Placeholder)
 * 
 * Future integration: Track foreclosures, liens, and distressed properties.
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';

export const distressAdapter: ModuleAdapter = {
    id: 'distress',
    title: 'Distress Signals',
    icon: 'alert-triangle',

    async discoverSchema(): Promise<SchemaDiscovery> {
        console.log('[distressAdapter] Schema discovery not implemented yet');
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
