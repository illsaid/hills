'use client';

import { useEffect, useState } from 'react';
import {
    Loader2, AlertCircle, ExternalLink, AlertTriangle,
    Shield, Landmark, Newspaper, Flame, CloudRain, Briefcase, Gavel
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseBrowser } from '@/lib/supabase/browser';

interface UnifiedFeedItem {
    id: string;
    type: 'safety' | 'event' | 'legislative' | 'intel' | 'enforcement' | 'business';
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

const TYPE_STYLES: Record<string, { indicator: string; text: string; icon: any }> = {
    safety: {
        indicator: 'bg-alert',
        text: 'text-alert',
        icon: Shield,
    },
    event: {
        indicator: 'bg-ink-muted',
        text: 'text-ink-muted',
        icon: Flame,
    },
    legislative: {
        indicator: 'bg-safe',
        text: 'text-safe',
        icon: Landmark,
    },
    intel: {
        indicator: 'bg-ink-muted',
        text: 'text-ink',
        icon: Newspaper,
    },
    enforcement: {
        indicator: 'bg-alert',
        text: 'text-alert',
        icon: Gavel,
    },
    business: {
        indicator: 'bg-safe',
        text: 'text-safe',
        icon: Briefcase,
    },
};

export function UnifiedFeedDashboard() {
    const [items, setItems] = useState<UnifiedFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFeed() {
            try {
                const res = await fetch('/api/unified-feed?limit=200');
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

                    // Only process Safety, Legislative
                    if (!['Safety', 'Legislative'].includes(newItem.category)) {
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
                        return updated.slice(0, 200);
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
            <div className="text-center py-16 border-0 rounded-2xl bg-panel shadow-soft/50">
                <Newspaper className="w-8 h-8 text-ink-muted/30 mx-auto mb-4" />
                <p className="text-ink-muted font-medium">No updates available</p>
                <p className="text-xs text-ink-muted/70 mt-1">Sources are quiet</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();

        // Handle future dates (events)
        if (diffMs < 0) {
            const diffDays = Math.ceil(Math.abs(diffMs) / 86400000);
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays < 7) return `In ${diffDays} days`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

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

                const Wrapper = item.url ? 'a' : 'div';
                const wrapperProps = item.url ? {
                    href: item.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "block h-full"
                } : { className: "block h-full" };

                return (
                    <Wrapper
                        key={item.id}
                        {...wrapperProps}
                    >
                        <div
                            className={`group p-5 rounded-2xl bg-panel shadow-soft hover:shadow-float transition-all duration-300 border border-transparent hover:border-border/50 h-full relative cursor-${item.url ? 'pointer' : 'default'}`}
                        >
                            {item.url && (
                                <ExternalLink className="absolute top-5 right-5 w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        {/* Calm Indicator Dot */}
                                        <div className={`w-1.5 h-1.5 rounded-full ${style.indicator}`} />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                                            {item.category}
                                        </span>
                                        <span className="text-xs text-ink-muted">•</span>
                                        <span className="text-xs text-ink-muted">{item.source_name}</span>
                                    </div>

                                    <h3 className="font-serif text-lg font-medium text-ink leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                    </h3>

                                    {item.description && (
                                        <p className="text-sm text-ink/70 leading-relaxed line-clamp-2 max-w-prose">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 mt-4 text-xs">
                                        <span className="text-ink-muted">
                                            {formatDate(item.published_at)}
                                        </span>
                                        {isHighPriority && (
                                            <Badge variant="outline" className="border-alert/30 text-alert bg-alert/5 text-[10px] font-medium px-2 py-0.5 h-5">
                                                Priority
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Wrapper>
                );
            })}

            <p className="text-center text-[10px] text-slate-400 dark:text-titanium-600 pt-2">
                Showing {items.length} items • Sorted by recency
            </p>
        </div>
    );
}
