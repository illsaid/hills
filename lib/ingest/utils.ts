import { BoundingBox } from './types';

export function pointInBbox(
  lat: number | null | undefined,
  lng: number | null | undefined,
  bbox: BoundingBox
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  return (
    lat >= bbox.min_lat &&
    lat <= bbox.max_lat &&
    lng >= bbox.min_lng &&
    lng <= bbox.max_lng
  );
}

export function matchesKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

export function findMatchedKeyword(text: string, keywords: string[]): string | null {
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  return null;
}

export function safeText(text: any, defaultValue: string = ''): string {
  if (typeof text === 'string') {
    return text.trim();
  }
  if (text === null || text === undefined) {
    return defaultValue;
  }
  return String(text).trim();
}

export function safeNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export function safeDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export const HOLLYWOOD_HILLS_KEYWORDS = [
  'Mulholland',
  'Laurel Canyon',
  'Nichols Canyon',
  'Runyon Canyon',
  'Beachwood',
  'Hollywood Hills',
  'Cahuenga',
  'Woodrow Wilson',
  'Lake Hollywood',
  'Hollywood Dell',
  'Sunset Plaza',
  'Bird Streets',
  'Outpost Estates',
];
