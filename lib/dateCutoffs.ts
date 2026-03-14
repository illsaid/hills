export const DATA_CUTOFFS = {
  SAFETY: 7,
  NEWS: 14,
  ROADWORK: 14,
  MAINTENANCE: 30,
  SECURITY: 30,
  ACTIVITY: 30,
  PULSE: 30,
  MARKET: 30,
  PERMITS: 90,
  BUSINESSES: 90,
  LEGISLATIVE: 60,
  CODE_ENFORCEMENT: 30,
} as const;

export function cutoffDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
