// Normalized feed item type for unified activity feed
export interface FeedItem {
    id: string;
    type: 'safety' | 'permit' | 'code' | 'event' | 'gov' | 'real_estate' | 'street_work' | 'news';
    severity: 0 | 1 | 2 | 3; // 0=info, 1=low, 2=medium, 3=high/urgent
    title: string;
    summary: string;
    timestamp: string; // ISO
    locationText: string | null;
    geo: { lat: number; lng: number } | null;
    sourceName: string;
    sourceUrl?: string;
    dedupeKey: string; // hash of title + date for deduplication
}

// Category filter options
export type FeedCategory =
    | 'all'
    | 'safety'
    | 'permits'
    | 'street_work'
    | 'government'
    | 'real_estate'
    | 'community';

// Sort options
export type FeedSort = 'urgent' | 'recent' | 'near_me';

// Alert chip for AlertStrip
export interface AlertChip {
    id: string;
    icon: string;
    title: string;
    age: string; // "2h ago", "Just now"
    distance?: string; // "0.5mi"
    severity: 'critical' | 'warning' | 'info';
    href?: string;
}

// Quick stat for right rail
export interface QuickStat {
    label: string;
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
}

// News headline for LocalNews
export interface NewsHeadline {
    id: string;
    source: string;
    sourceFavicon?: string;
    title: string;
    timestamp: string;
    href: string;
}
