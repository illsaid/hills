'use client';

import { useState } from 'react';
import {
    AlertStrip,
    KPIRow,
    ActivityFeed,
    RightRail,
    type FeedItem,
    type AlertChip,
    type QuickStat,
    type NewsHeadline,
} from '@/components/dashboard';

interface DashboardClientProps {
    feedItems: FeedItem[];
    alertChips: AlertChip[];
    totalAlertCount?: number;
    aqi: { value: number; status: string; updatedAt?: string };
    weather?: { temp: number; condition: string; high: number; low: number; wind?: string };
    stats: QuickStat[];
    newsHeadlines: NewsHeadline[];
    newsUpdatedAt?: string;
    openCases?: number;
}

export function DashboardClient({
    feedItems,
    alertChips,
    totalAlertCount,
    aqi,
    weather,
    stats,
    newsHeadlines,
    newsUpdatedAt,
    openCases,
}: DashboardClientProps) {
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    const handleSelectItem = (item: FeedItem) => {
        setSelectedItemId(item.id);
        // In a real implementation, this would also scroll to the item or highlight on map
    };

    const handlePinClick = (item: FeedItem) => {
        setSelectedItemId(item.id);
        // Could also scroll feed to this item
    };

    return (
        <div className="p-4 md:p-6 max-w-[1440px] mx-auto">
            {/* Dashboard Grid — single column on small/medium, two-column on xl+ */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                {/* Main Column */}
                <div className="space-y-6 min-w-0">
                    <AlertStrip alerts={alertChips} totalCount={totalAlertCount} />
                    <KPIRow aqi={aqi} weather={weather} openCases={openCases} />
                    <ActivityFeed
                        items={feedItems}
                        onSelectItem={handleSelectItem}
                    />
                </div>

                {/* Right Rail — hidden on mobile, shown on xl+ */}
                <div className="hidden xl:block min-w-0">
                    <RightRail
                        feedItems={feedItems}
                        selectedItemId={selectedItemId}
                        onPinClick={handlePinClick}
                        stats={stats}
                        newsHeadlines={newsHeadlines}
                        newsUpdatedAt={newsUpdatedAt}
                    />
                </div>
            </div>
        </div>
    );
}
