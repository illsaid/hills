export const HILLS_CENTER = { lat: 34.12, lng: -118.345 } as const;

export const HILLS_BOUNDS = {
  minLat: 34.06,
  maxLat: 34.17,
  minLng: -118.42,
  maxLng: -118.28,
} as const;

export const HILLS_ZIP_CODES = ['90046', '90068', '90069'] as const;

export const HILLS_AREA_SLUG = 'hollywood-hills';

export const DEMO_ADDRESS = {
  id: 'demo',
  label: 'Demo: Hollywood Hills',
  address_text: 'Hollywood Hills, Los Angeles, CA',
  lat: 34.12,
  lon: -118.345,
} as const;

export const DEFAULT_RADIUS_M = 500;
export const DEFAULT_WINDOW_DAYS = 90;

export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const NWS_FORECAST_URL = 'https://api.weather.gov/gridpoints/LOX/152,48/forecast/hourly';

export const BUSINESS_API_URL = 'https://data.lacity.org/resource/r4uk-afju.json';
export const BUSINESS_CACHE_TTL_MS = 5 * 60 * 1000;
