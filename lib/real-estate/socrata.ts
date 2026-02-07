/**
 * Socrata API helpers (server-side only)
 * 
 * These helpers must only be called from server-side code (API routes).
 * Never import this in client components to avoid CORS/rate limit issues.
 */

const SOCRATA_TIMEOUT = 10000; // 10s timeout

/**
 * Fetch a single sample record to discover schema keys.
 * Logs keys to console for development.
 */
export async function socrataSample(
    baseUrl: string
): Promise<Record<string, unknown> | null> {
    try {
        const url = `${baseUrl}?$limit=1`;
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(SOCRATA_TIMEOUT),
        });

        if (!response.ok) {
            console.error(`[socrataSample] Failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const sample = data[0];
            console.log('[socrataSample] Discovered keys:', Object.keys(sample));
            return sample;
        }

        return null;
    } catch (error) {
        console.error('[socrataSample] Error:', error);
        return null;
    }
}

/**
 * Execute a SoQL query against a Socrata dataset.
 * 
 * @param baseUrl - The base resource URL (e.g., https://data.lacity.org/resource/pi9x-tg5x.json)
 * @param soql - The SoQL query parameters
 */
export async function socrataQuery(
    baseUrl: string,
    soql: {
        select?: string;
        where?: string;
        order?: string;
        limit?: number;
        offset?: number;
    }
): Promise<Record<string, unknown>[]> {
    try {
        const params = new URLSearchParams();

        if (soql.select) params.set('$select', soql.select);
        if (soql.where) params.set('$where', soql.where);
        if (soql.order) params.set('$order', soql.order);
        if (soql.limit) params.set('$limit', soql.limit.toString());
        if (soql.offset) params.set('$offset', soql.offset.toString());

        const url = `${baseUrl}?${params.toString()}`;
        console.log('[socrataQuery] Fetching:', url);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(SOCRATA_TIMEOUT),
        });

        if (!response.ok) {
            console.error(`[socrataQuery] Failed: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('[socrataQuery] Error:', error);
        return [];
    }
}

/**
 * Test if a spatial query (within_circle) is supported on a geolocation field.
 * Returns true if the query succeeds with at least 0 results.
 */
export async function testSpatialQuery(
    baseUrl: string,
    geoField: string,
    lon: number,
    lat: number,
    radiusM: number
): Promise<boolean> {
    try {
        const url = `${baseUrl}?$select=count(*)&$where=within_circle(${geoField},${lat},${lon},${radiusM})`;
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(SOCRATA_TIMEOUT),
        });

        if (!response.ok) {
            console.log(`[testSpatialQuery] within_circle not supported: ${response.status}`);
            return false;
        }

        console.log('[testSpatialQuery] within_circle is supported');
        return true;
    } catch (error) {
        console.log('[testSpatialQuery] within_circle test failed:', error);
        return false;
    }
}
