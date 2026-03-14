export const DATA_CUTOFFS = {
  SAFETY: 7,
  NEWS: 365,
  ROADWORK: 14,
  MAINTENANCE: 60,
  SECURITY: 45,
  ACTIVITY: 30,
  PULSE: 45,
  MARKET: 30,
  PERMITS: 90,
  BUSINESSES: 90,
  LEGISLATIVE: 60,
  CODE_ENFORCEMENT: 30,
} as const;

export function cutoffDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
