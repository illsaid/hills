/**
 * Format a timestamp as a human-readable age string.
 * - < 60m → "12m"
 * - < 24h → "3h"
 * - 1–6d → "5d"
 * - > 6d → "Jan 30" (short date)
 */
export function formatAge(ts: string | number | Date, now = new Date()): string {
    const d = new Date(ts);
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "—";

    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;

    const days = Math.floor(hrs / 24);
    if (days <= 6) return `${days}d`;

    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Format a timestamp for feed items (same logic as formatAge but with "Just now" for very recent)
 */
export function formatFeedAge(ts: string | number | Date, now = new Date()): string {
    const d = new Date(ts);
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "—";

    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;

    const days = Math.floor(hrs / 24);
    if (days <= 6) return `${days}d`;

    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Format "Updated X ago" with fallback for missing/static data
 */
export function formatUpdatedAgo(ts?: string | null, now = new Date()): string {
    if (!ts) return "—";
    return `Updated ${formatAge(ts, now)}`;
}
