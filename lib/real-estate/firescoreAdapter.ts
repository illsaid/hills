/**
 * FireScore Adapter
 * Provides Fire Hazard Severity Zone intelligence.
 */

import type { ModuleAdapter, IntelEvent, AddressParams, ModuleSummary, SchemaDiscovery } from './types';
import { getFireZoneForPoint, checkFireScoreLoaded } from './firescore';

// Strict mapping for consistent labeling
const LABEL_MAP: Record<string, string> = {
    'VERY HIGH': 'Very High Fire Hazard',
    'HIGH': 'High Fire Hazard',
    'MODERATE': 'Moderate Fire Hazard',
    'VERY_HIGH': 'Very High Fire Hazard', // Fallback
    'OTHER': 'Moderate/Other Fire Hazard'
};

const SEVERITY_MAP: Record<string, 'high' | 'med' | 'low'> = {
    'VERY HIGH': 'high',
    'HIGH': 'med',
    'MODERATE': 'low',
    'VERY_HIGH': 'high',
    'OTHER': 'low'
};

// ArcGIS FeatureServer URL provided by user
const ARCGIS_BASE_URL = 'https://gis.data.cnra.ca.gov/arcgis/rest/services/CALFIRE-Forestry/Fire_Hazard_Severity_Zone_Viewer/FeatureServer';

export const firescoreAdapter: ModuleAdapter = {
    id: 'firescore',
    title: 'FireScore',
    icon: 'shield',

    async discoverSchema(): Promise<SchemaDiscovery> {
        return {
            keys: ['HAZ_CLASS', 'source', 'layer'],
            sample: { HAZ_CLASS: 'Very High', source: 'CALFIRE_SRA', layer: '2' }
        };
    },

    async getSummary(params: AddressParams): Promise<ModuleSummary> {
        return fetchFireData(params.lat, params.lon, 'summary');
    },

    async getItems(params: AddressParams): Promise<IntelEvent[]> {
        return fetchFireData(params.lat, params.lon, 'items');
    },
};

// Helper to fetch from ArcGIS SRA (Layer 2) and LRA (Layer 1)
async function fetchFireData(lat: number, lon: number, mode: 'summary' | 'items'): Promise<any> {
    try {
        // Query params for ArcGIS
        const queryParams = new URLSearchParams({
            geometry: `${lon},${lat}`,
            geometryType: 'esriGeometryPoint',
            inSR: '4326',
            spatialRel: 'esriSpatialRelIntersects',
            outFields: '*',
            f: 'json',
            returnGeometry: 'false'
        });

        // Fetch SRA (Layer 2) and LRA (Layer 1) in parallel
        const [sraRes, lraRes] = await Promise.all([
            fetch(`${ARCGIS_BASE_URL}/2/query?${queryParams}`),
            fetch(`${ARCGIS_BASE_URL}/1/query?${queryParams}`)
        ]);

        let attributes: any = null;
        let sourceLayer = '';

        // Check SRA first (State Responsibility Area - typically higher risk)
        if (sraRes.ok) {
            const sraData = await sraRes.json();
            if (sraData.features && sraData.features.length > 0) {
                attributes = sraData.features[0].attributes;
                sourceLayer = 'State Responsibility Area (SRA)';
            }
        }

        // If no SRA, check LRA (Local Responsibility Area)
        if (!attributes && lraRes.ok) {
            const lraData = await lraRes.json();
            if (lraData.features && lraData.features.length > 0) {
                attributes = lraData.features[0].attributes;
                sourceLayer = 'Local Responsibility Area (LRA)';
            }
        }

        // Process results
        if (!attributes) {
            // No data found -> Outside mapped high hazard zones
            if (mode === 'summary') {
                return {
                    newCount: 0,
                    headlineMetric: 'Outside mapped high hazard zone'
                };
            }
            return [];
        }

        // Map content
        const hazClass = attributes['HAZ_CLASS'] || attributes['haz_class'] || 'Unknown';
        const label = LABEL_MAP[hazClass.toUpperCase()] || hazClass;
        const isHigh = hazClass.toUpperCase().includes('HIGH');

        if (mode === 'summary') {
            return {
                newCount: isHigh ? 1 : 0,
                headlineMetric: label,
                topTag: isHigh ? 'AB-38 likely' : undefined
            };
        } else {
            return [{
                source: 'firescore',
                title: `Fire Hazard Severity: ${hazClass}`,
                event_date: new Date().toISOString(),
                address_text: null,
                lat,
                lon,
                distance_m: 0,
                severity: SEVERITY_MAP[hazClass.toUpperCase()] || 'low',
                confidence: 'high',
                source_url: 'https://egis.fire.ca.gov/FHSZ/',
                raw: { ...attributes, sourceLayer },
            }];
        }

    } catch (error) {
        console.error('FireScore ArcGIS Fetch Error:', error);
        if (mode === 'summary') {
            return {
                newCount: 0,
                headlineMetric: 'Service Unavailable',
                topTag: 'Check connection'
            };
        }
        return [];
    }
}
