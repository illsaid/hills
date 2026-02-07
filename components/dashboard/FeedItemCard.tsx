'use client';

import { ChevronRight, MapPin, ExternalLink, Shield, FileText, Construction, Landmark, Home, Users } from 'lucide-react';
import { formatFeedAge } from './utils';
import type { FeedItem } from './types';

interface FeedItemCardProps {
    item: FeedItem;
    onSelect?: (item: FeedItem) => void;
}

// Display badge based on type and severity
function displayBadge(item: FeedItem): { text: string; style: string } {
    if (item.severity === 3) {
        return { text: 'URGENT', style: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' };
    }
    if (item.type === 'event') {
        return { text: 'NOTICE', style: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' };
    }
    if (item.type === 'gov') {
        return { text: 'UPDATE', style: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' };
    }
    if (item.type === 'permit') {
        return { text: 'PERMIT', style: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400' };
    }
    if (item.type === 'safety') {
        return { text: 'ALERT', style: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' };
    }
    if (item.type === 'code') {
        return { text: 'CODE', style: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' };
    }
    return { text: 'INFO', style: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' };
}

// Derive title if missing or generic
function displayTitle(item: FeedItem): string {
    if (item.title && item.title !== 'OTHER' && item.title.toLowerCase() !== 'other') {
        return item.title;
    }

    const summary = (item.summary ?? '').toLowerCase();
    if (item.type === 'event' && summary.includes('board meeting')) {
        return 'Neighborhood Council Meeting';
    }
    if (item.type === 'event' && summary.includes('public notice')) {
        return 'Public Notice';
    }
    if (item.type === 'code') {
        return 'Code Enforcement Case';
    }
    if (item.type === 'gov') {
        return 'Government Update';
    }
    return 'Update';
}

export function FeedItemCard({ item, onSelect }: FeedItemCardProps) {
    const getTypeIcon = (type: FeedItem['type']) => {
        switch (type) {
            case 'safety': return <Shield className="w-3.5 h-3.5" />;
            case 'permit': return <FileText className="w-3.5 h-3.5" />;
            case 'code': return <FileText className="w-3.5 h-3.5" />;
            case 'street_work': return <Construction className="w-3.5 h-3.5" />;
            case 'gov': return <Landmark className="w-3.5 h-3.5" />;
            case 'real_estate': return <Home className="w-3.5 h-3.5" />;
            case 'event': return <Users className="w-3.5 h-3.5" />;
            default: return <Shield className="w-3.5 h-3.5" />;
        }
    };

    const getTypeLabel = (type: FeedItem['type']) => {
        switch (type) {
            case 'safety': return 'Safety';
            case 'permit': return 'Permit';
            case 'code': return 'Code';
            case 'street_work': return 'Street Work';
            case 'gov': return 'Government';
            case 'real_estate': return 'Real Estate';
            case 'event': return 'Community';
            default: return type;
        }
    };

    const getSeverityBorder = (severity: FeedItem['severity']) => {
        switch (severity) {
            case 3: return 'border-l-red-500';
            case 2: return 'border-l-amber-500';
            case 1: return 'border-l-blue-500';
            default: return 'border-l-slate-300 dark:border-l-slate-600';
        }
    };

    const badge = displayBadge(item);
    const title = displayTitle(item);

    return (
        <div
            onClick={() => onSelect?.(item)}
            className={`group p-4 rounded-xl border-l-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer transition-all hover:shadow-md ${getSeverityBorder(item.severity)}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Badge • Category • Age */}
                    <div className="flex items-center gap-2 mb-1.5 text-xs">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${badge.style}`}>
                            {badge.text}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            {getTypeIcon(item.type)}
                            {getTypeLabel(item.type)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400 tabular-nums">{formatFeedAge(item.timestamp)}</span>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">
                        {title}
                    </h4>

                    {/* Summary - 2 line clamp */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                        {item.summary}
                    </p>

                    {/* Source + Location */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {item.sourceName}
                        </span>
                        {item.locationText && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{item.locationText}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 flex-shrink-0 mt-1" />
            </div>
        </div>
    );
}
