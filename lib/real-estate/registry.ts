/**
 * Module Registry
 * 
 * Central registry of all available feed adapters.
 */

import type { ModuleAdapter } from './types';
import { permitsAdapter } from './permitsAdapter';
import { buildwatchAdapter } from './buildwatchAdapter';
import { distressAdapter } from './distressAdapter';
import { firescoreAdapter } from './firescoreAdapter';

/**
 * All registered adapters
 */
export const adapters: ModuleAdapter[] = [
    permitsAdapter,
    buildwatchAdapter,
    distressAdapter,
    firescoreAdapter,
];

/**
 * Get adapter by ID
 */
export function getAdapter(id: string): ModuleAdapter | undefined {
    return adapters.find(a => a.id === id);
}

/**
 * Get all adapter summaries (for rendering tiles)
 */
export async function getAllSummaries(params: { lat: number; lon: number; radius_m: number; window_days: number }) {
    const results = await Promise.all(
        adapters.map(async (adapter) => {
            try {
                const summary = await adapter.getSummary(params);
                return {
                    id: adapter.id,
                    title: adapter.title,
                    icon: adapter.icon,
                    ...summary,
                };
            } catch (error) {
                console.error(`[registry] Error getting summary for ${adapter.id}:`, error);
                return {
                    id: adapter.id,
                    title: adapter.title,
                    icon: adapter.icon,
                    newCount: 0,
                    headlineMetric: 'Error loading',
                    topTag: undefined,
                };
            }
        })
    );

    return results;
}
