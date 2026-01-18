'use client';

import { useEffect, useState } from 'react';
import { Newspaper, Loader2, AlertCircle, ExternalLink, AlertTriangle, TrafficCone, Home, Palmtree } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IntelItem {
    id: string;
    source_name: string;
    title: string;
    description: string | null;
    url: string;
    category: string;
    published_at: string | null;
    created_at: string;
}

interface FeedResponse {
    success: boolean;
    count: number;
    items: IntelItem[];
    error?: string;
}

// Category color mapping
const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    Safety: {
        bg: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700/50',
        text: 'text-red-700 dark:text-red-400',
        icon: AlertTriangle,
    },
    Traffic: {
        bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50',
        text: 'text-amber-700 dark:text-amber-400',
        icon: TrafficCone,
    },
    Housing: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700/50',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: Home,
    },
    Tourism: {
        bg: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700/50',
        text: 'text-purple-700 dark:text-purple-400',
        icon: Palmtree,
    },
    News: {
        bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700/50',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Newspaper,
    },
};

export function NeighborhoodFeedDashboard() {
    const [items, setItems] = useState<IntelItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFeed() {
            try {
                const res = await fetch('/api/neighborhood-feed?limit=10');
                const data: FeedResponse = await res.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch feed');
                }

                setItems(data.items);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchFeed();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-titanium-500" />
                <span className="ml-2 text-slate-500 dark:text-titanium-400">Loading feed...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12 text-red-500">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">
                <Newspaper className="w-10 h-10 text-slate-300 dark:text-titanium-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-titanium-400">No neighborhood intel yet.</p>
                <p className="text-xs text-slate-400 dark:text-titanium-600 mt-1">Run the scraper to populate the feed</p>
            </div>
        );
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getCategoryStyle = (category: string) => {
        return CATEGORY_STYLES[category] || CATEGORY_STYLES.News;
    };

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const style = getCategoryStyle(item.category);
                const IconComponent = style.icon;

                return (
                    <div
                        key={item.id}
                        className="group p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className="font-medium text-slate-900 dark:text-titanium-100 text-sm leading-tight line-clamp-2">
                                    {item.title}
                                </h3>

                                {/* Description */}
                                {item.description && (
                                    <p className="text-sm text-slate-500 dark:text-titanium-400 line-clamp-2 mt-1">
                                        {item.description}
                                    </p>
                                )}

                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                    <Badge variant="outline" className={`${style.bg} ${style.text}`}>
                                        <IconComponent className="w-3 h-3 mr-1" />
                                        {item.category}
                                    </Badge>
                                    <span className="text-slate-400 dark:text-titanium-500">•</span>
                                    <span className="text-slate-400 dark:text-titanium-500">{item.source_name}</span>
                                    {item.published_at && (
                                        <>
                                            <span className="text-slate-400 dark:text-titanium-500">•</span>
                                            <span className="text-slate-400 dark:text-titanium-500">
                                                {formatDate(item.published_at)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Read More button */}
                            {item.url && (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-titanium-300 transition-all"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}

            {items.length >= 10 && (
                <p className="text-center text-[10px] text-slate-400 dark:text-titanium-600 pt-2">
                    Showing latest 10 items
                </p>
            )}
        </div>
    );
}
