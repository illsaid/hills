'use client';

import { ExternalLink, Clock } from 'lucide-react';
import { formatAge } from './utils';
import type { NewsHeadline } from './types';

interface LocalNewsProps {
    headlines: NewsHeadline[];
    updatedAt?: string;
}

export function LocalNews({ headlines, updatedAt }: LocalNewsProps) {
    // Filter out placeholder/junk headlines
    const validHeadlines = headlines.filter((h) => {
        if (!h.title || h.title.length < 10) return false;
        if (h.title.toLowerCase().includes('placeholder')) return false;
        return true;
    });

    // Empty state if no valid headlines
    if (validHeadlines.length === 0) {
        return (
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Local News</h3>
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                    Local news feed not configured yet
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Local News</h3>
                {updatedAt && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatAge(updatedAt)}
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {validHeadlines.slice(0, 5).map((headline) => (
                    <a
                        key={headline.id}
                        href={headline.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                    >
                        <div className="flex items-start gap-1.5">
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 flex-1">
                                {headline.title}
                            </p>
                            <ExternalLink className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded font-medium">
                                {headline.source}
                            </span>
                            <span className="tabular-nums">{formatAge(headline.timestamp)}</span>
                        </div>
                    </a>
                ))}
            </div>

            {validHeadlines.length > 0 && (
                <a
                    href="/council"
                    className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                    See all news
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            )}
        </div>
    );
}
