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
        <div className="p-6 max-w-[1440px] mx-auto">
            {/* CSS variable for header offset */}
            <style jsx>{`
        :root {
          --app-header-offset: 64px;
        }
      `}</style>

            {/* Dashboard Grid */}
            <div
                className="grid gap-6"
                style={{
                    gridTemplateColumns: 'minmax(680px, 1fr) minmax(340px, 380px)',
                }}
            >
                {/* Main Column */}
                <div className="space-y-6 min-w-0">
                    {/* Alert Strip */}
                    <AlertStrip alerts={alertChips} totalCount={totalAlertCount} />

                    {/* KPI Row */}
                    <KPIRow aqi={aqi} weather={weather} openCases={openCases} />

                    {/* Activity Feed */}
                    <ActivityFeed
                        items={feedItems}
                        onSelectItem={handleSelectItem}
                    />
                </div>

                {/* Right Rail */}
                <div className="min-w-0">
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

            {/* Responsive: Stack on smaller screens */}
            <style jsx>{`
        @media (max-width: 1279px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
