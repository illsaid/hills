
'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
    headline: string;
    source: string;
    url: string;
    published: string;
    summary: string;
    keyword_match: string;
}

interface FeedData {
    updated_at: string;
    items: NewsItem[];
}

export function NewsFeed() {
    const [data, setData] = useState<FeedData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/news-feed');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load news feed', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return null;
    if (!data || data.items.length === 0) {
        return (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-5 text-center text-slate-500 text-sm">
                    No recent news for filtered keywords.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="h-1 w-full bg-blue-500" />
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Newspaper className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-titanium-100">
                            Community News
                        </h3>
                    </div>
                </div>

                <div className="space-y-4">
                    {data.items.map((item, i) => (
                        <a
                            key={i}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {item.source}
                                </Badge>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                    {formatDistanceToNow(new Date(item.published), { addSuffix: true })}
                                </span>
                            </div>

                            <div className="flex items-start gap-1.5">
                                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight mb-1 transition-colors flex-1">
                                    {item.headline}
                                </h4>
                                <ExternalLink className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {item.summary}
                            </p>
                        </a>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="text-[10px] text-slate-400">
                        Filtered: &ldquo;Hollywood Hills&rdquo;, &ldquo;Runyon&rdquo;, etc.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
