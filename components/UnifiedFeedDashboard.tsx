'use client';

import { useEffect, useState } from 'react';
import {
    Loader2, AlertCircle, ExternalLink, AlertTriangle,
    Shield, Landmark, Newspaper, Flame, CloudRain
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';

interface UnifiedFeedItem {
    id: string;
    type: 'safety' | 'event' | 'legislative' | 'intel';
    title: string;
    description: string | null;
    url: string | null;
    category: string;
    source_name: string;
    priority?: number;
    published_at: string;
    created_at: string;
}

interface FeedResponse {
    success: boolean;
    count: number;
    items: UnifiedFeedItem[];
    error?: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    safety: {
        bg: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700/50',
        text: 'text-red-700 dark:text-red-400',
        icon: Shield,
    },
    event: {
        bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Flame,
    },
    legislative: {
        bg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700/50',
        text: 'text-indigo-700 dark:text-indigo-400',
        icon: Landmark,
    },
    intel: {
        bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700/50',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Newspaper,
    },
};

export function UnifiedFeedDashboard() {
    const [items, setItems] = useState<UnifiedFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFeed() {
            try {
                const res = await fetch('/api/unified-feed?limit=25');
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

        // Realtime subscription for new intel items
        const channel = supabaseBrowser
            .channel('unified_feed_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'neighborhood_intel',
                },
                (payload) => {
                    const newItem = payload.new as any;

                    // Only process Safety, Legislative, News
                    if (!['Safety', 'Legislative', 'News'].includes(newItem.category)) {
                        return;
                    }

                    const normalized: UnifiedFeedItem = {
                        id: newItem.id,
                        type: newItem.category === 'Safety' ? 'safety' :
                            newItem.category === 'Legislative' ? 'legislative' : 'intel',
                        title: newItem.title,
                        description: newItem.description,
                        url: newItem.url,
                        category: newItem.category,
                        source_name: newItem.source_name,
                        priority: newItem.priority,
                        published_at: newItem.published_at || newItem.created_at,
                        created_at: newItem.created_at,
                    };

                    setItems((prev) => {
                        if (prev.some(i => i.id === normalized.id)) return prev;
                        const updated = [normalized, ...prev];
                        // Re-sort by date
                        updated.sort((a, b) =>
                            new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
                        );
                        return updated.slice(0, 30);
                    });
                }
            )
            .subscribe();

        return () => {
            supabaseBrowser.removeChannel(channel);
        };
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
                <p className="text-slate-500 dark:text-titanium-400">No updates yet.</p>
                <p className="text-xs text-slate-400 dark:text-titanium-600 mt-1">Waiting for data ingestion</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStyle = (type: string) => {
        return TYPE_STYLES[type] || TYPE_STYLES.intel;
    };

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const style = getStyle(item.type);
                const IconComponent = style.icon;
                const isHighPriority = item.priority === 1;

                return (
                    <div
                        key={item.id}
                        className={`group p-4 rounded-xl border ${isHighPriority ? 'border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'} hover:bg-slate-50 dark:hover:bg-white/10 transition-all`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <IconComponent className={`w-4 h-4 ${style.text} flex-shrink-0`} />
                                    <h3 className="font-medium text-slate-900 dark:text-titanium-100 text-sm leading-tight line-clamp-2">
                                        {item.url ? (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                            >
                                                {item.title}
                                            </a>
                                        ) : (
                                            item.title
                                        )}
                                    </h3>
                                </div>

                                {item.description && (
                                    <p className="text-sm text-slate-500 dark:text-titanium-400 line-clamp-2 mt-1">
                                        {item.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                    <Badge variant="outline" className={`${style.bg} ${style.text}`}>
                                        {item.category}
                                    </Badge>
                                    <span className="text-slate-400 dark:text-titanium-500">•</span>
                                    <span className="text-slate-400 dark:text-titanium-500">{item.source_name}</span>
                                    <span className="text-slate-400 dark:text-titanium-500">•</span>
                                    <span className="text-slate-400 dark:text-titanium-500">
                                        {formatDate(item.published_at)}
                                    </span>
                                    {isHighPriority && (
                                        <>
                                            <span className="text-slate-400 dark:text-titanium-500">•</span>
                                            <span className="text-red-500 font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                HIGH PRIORITY
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

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

            <p className="text-center text-[10px] text-slate-400 dark:text-titanium-600 pt-2">
                Showing {items.length} items • Sorted by recency
            </p>
        </div>
    );
}
