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
        <div
            className="right-rail flex flex-col gap-4"
            style={{ alignSelf: 'start' }}
        >
            {/* Sticky Map Wrapper - only sticky on xl+ screens */}
            <div className="xl:sticky xl:top-[var(--app-header-offset,64px)]">
                {/* Explicit height container with relative positioning for absolute children */}
                <div className="relative h-[400px] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <StickyMap
                        items={feedItems}
                        selectedItemId={selectedItemId}
                        onPinClick={onPinClick}
                    />
                </div>
            </div>

            {/* Quick Stats - normal flow, no z-index needed */}
            <div className="relative">
                <QuickStats stats={stats} />
            </div>

            {/* Local News - normal flow */}
            <LocalNews headlines={newsHeadlines} updatedAt={newsUpdatedAt} />
        </div>
    );
}
