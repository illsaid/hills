/**
 * Haversine distance calculation and radius filtering.
 * Used as fallback when Socrata within_circle is not available.
 */

const EARTH_RADIUS_M = 6371000; // Earth's radius in meters

/**
 * Calculate the haversine distance between two points.
 * @returns Distance in meters
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = (deg: number) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_M * c;
}

/**
 * Filter items by radius from a center point.
 * Adds distance_m to each item.
 */
export function filterByRadius<T extends { lat?: number | null; lon?: number | null }>(
    items: T[],
    centerLat: number,
    centerLon: number,
    radiusM: number
): (T & { distance_m: number })[] {
    return items
        .map((item) => {
            const lat = typeof item.lat === 'number' ? item.lat : null;
            const lon = typeof item.lon === 'number' ? item.lon : null;

            if (lat === null || lon === null) {
                return { ...item, distance_m: Infinity };
            }

            const distance_m = haversineDistance(centerLat, centerLon, lat, lon);
            return { ...item, distance_m };
        })
        .filter((item) => item.distance_m <= radiusM)
        .sort((a, b) => a.distance_m - b.distance_m);
}

/**
 * Calculate a bounding box for a given center point and radius.
 * Useful for initial filtering before precise haversine calculation.
 */
export function boundingBox(
    lat: number,
    lon: number,
    radiusM: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    // Approximate degrees per meter at this latitude
    const latDelta = radiusM / 111320; // ~111.32 km per degree of latitude
    const lonDelta = radiusM / (111320 * Math.cos(lat * (Math.PI / 180)));

    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLon: lon - lonDelta,
        maxLon: lon + lonDelta,
    };
}
