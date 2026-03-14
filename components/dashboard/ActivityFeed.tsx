'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, List, Map as MapIcon, Loader as Loader2 } from 'lucide-react';
import { FeedItemCard } from './FeedItemCard';
import { ActivityFeedMap } from './ActivityFeedMap';
import type { FeedItem, FeedCategory, FeedSort } from './types';

interface ActivityFeedProps {
    items: FeedItem[];
    onSelectItem?: (item: FeedItem) => void;
    loading?: boolean;
    selectedItemId?: string;
}

const CATEGORY_FILTERS: { value: FeedCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'safety', label: 'Safety' },
    { value: 'permits', label: 'Permits' },
    { value: 'street_work', label: 'Street Work' },
    { value: 'government', label: 'Government' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'community', label: 'Community' },
];

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
    { value: 'recent', label: 'Recent' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'near_me', label: 'Near me' },
];

export function ActivityFeed({ items, onSelectItem, loading, selectedItemId }: ActivityFeedProps) {
    const [category, setCategory] = useState<FeedCategory>('all');
    const [sort, setSort] = useState<FeedSort>('recent');
    const [view, setView] = useState<'list' | 'map'>('list');
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedItemId || view !== 'list') return;
        const el = listRef.current?.querySelector(`[data-feed-item-id="${selectedItemId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedItemId, view]);

    const filteredItems = items.filter((item) => {
        if (category === 'all') return true;
        if (category === 'permits') return item.type === 'permit';
        if (category === 'street_work') return item.type === 'street_work';
        if (category === 'government') return item.type === 'gov';
        if (category === 'real_estate') return item.type === 'real_estate';
        if (category === 'community') return item.type === 'event';
        if (category === 'safety') return item.type === 'safety' || item.type === 'code';
        return true;
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sort === 'urgent') {
            if (b.severity !== a.severity) return b.severity - a.severity;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return (
        <div className="flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-stone-50 dark:bg-slate-900 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Activity</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 font-medium px-2 py-0.5 bg-stone-100 rounded-full">
                            Snapshot
                        </span>
                        {/* View toggle */}
                        <div className="flex items-center bg-stone-100 dark:bg-white/10 rounded-full p-0.5">
                            <button
                                onClick={() => setView('list')}
                                className={`p-1.5 rounded-full transition-colors ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                title="List view"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setView('map')}
                                className={`p-1.5 rounded-full transition-colors ${view === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                title="Map view"
                            >
                                <MapIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {CATEGORY_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setCategory(filter.value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === filter.value
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {view === 'list' && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Sort:</span>
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as FeedSort)}
                                className="text-sm font-medium bg-transparent text-slate-700 dark:text-slate-300 border-none focus:outline-none cursor-pointer appearance-none pr-5"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
            ) : view === 'map' ? (
                <ActivityFeedMap items={sortedItems} onSelectItem={onSelectItem} />
            ) : sortedItems.length === 0 ? (
                <div className="text-center py-12 space-y-1">
                    <p className="text-sm font-medium text-stone-500">No activity data</p>
                    <p className="text-xs text-stone-400">
                        {category === 'all' ? 'No activity data yet' : `No ${category.replace('_', ' ')} data yet`}
                    </p>
                </div>
            ) : (
                <div ref={listRef} className="space-y-3 flex-1">
                    {sortedItems.map((item) => (
                        <FeedItemCard
                            key={item.id}
                            item={item}
                            onSelect={onSelectItem}
                            isHighlighted={item.id === selectedItemId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
