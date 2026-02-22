export type LngLat = [number, number];

const HILLS_POLYGON: LngLat[] = [
  [-118.4205, 34.1450],
  [-118.3820, 34.1480],
  [-118.3600, 34.1390],
  [-118.3380, 34.1270],
  [-118.3150, 34.1090],
  [-118.3020, 34.0960],
  [-118.3050, 34.0850],
  [-118.3180, 34.0780],
  [-118.3380, 34.0780],
  [-118.3530, 34.0830],
  [-118.3680, 34.0890],
  [-118.3820, 34.0940],
  [-118.3980, 34.0980],
  [-118.4150, 34.1050],
  [-118.4280, 34.1180],
  [-118.4350, 34.1320],
  [-118.4205, 34.1450],
];

function pointInPolygon(lng: number, lat: number, polygon: LngLat[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInHillsBoundary(lat: number, lon: number): boolean {
  return pointInPolygon(lon, lat, HILLS_POLYGON);
}
