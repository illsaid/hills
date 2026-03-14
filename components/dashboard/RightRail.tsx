'use client';

import { StickyMap } from './StickyMap';
import { QuickStats } from './QuickStats';
import { LocalNews } from './LocalNews';
import type { FeedItem, QuickStat, NewsHeadline } from './types';

interface RightRailProps {
    feedItems: FeedItem[];
    selectedItemId?: string;
    onPinClick?: (item: FeedItem) => void;
    stats: QuickStat[];
    newsHeadlines: NewsHeadline[];
    newsUpdatedAt?: string;
}

export function RightRail({
    feedItems,
    selectedItemId,
    onPinClick,
    stats,
    newsHeadlines,
    newsUpdatedAt,
}: RightRailProps) {
    return (
        <div className="right-rail flex flex-col gap-4">
            {/* Sticky Map — sticks to top of viewport as user scrolls */}
            <div className="sticky top-[var(--app-header-offset,64px)] z-10">
                <div className="relative h-[320px] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm">
                    <StickyMap
                        items={feedItems}
                        selectedItemId={selectedItemId}
                        onPinClick={onPinClick}
                    />
                </div>
            </div>

            <QuickStats stats={stats} />

            <LocalNews headlines={newsHeadlines} updatedAt={newsUpdatedAt} />
        </div>
    );
}
