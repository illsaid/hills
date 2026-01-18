'use client';

import { useEffect, useState } from 'react';
import { Landmark, Loader2, AlertCircle, ExternalLink, Truck, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LegislativeUpdate {
    id: string;
    title: string;
    category: string;
    date: string;
    summary: string;
    impact_label: 'Logistics Update' | 'Property Intelligence' | null;
    source_url: string;
    source_name: string;
}

interface LegislativeResponse {
    success: boolean;
    count: number;
    updates: LegislativeUpdate[];
    error?: string;
}

export function LegislativeSentinelDashboard() {
    const [updates, setUpdates] = useState<LegislativeUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUpdates() {
            try {
                const res = await fetch('/api/legislative');
                const data: LegislativeResponse = await res.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch legislative updates');
                }

                setUpdates(data.updates);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUpdates();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-titanium-500" />
                <span className="ml-2 text-slate-500 dark:text-titanium-400">Loading legislative updates...</span>
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

    if (updates.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">
                <Landmark className="w-10 h-10 text-slate-300 dark:text-titanium-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-titanium-400">No relevant legislative updates.</p>
            </div>
        );
    }

    const getImpactBadge = (label: string | null) => {
        if (label === 'Logistics Update') {
            return (
                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50">
                    <Truck className="w-3 h-3 mr-1" />
                    Logistics Update
                </Badge>
            );
        }
        if (label === 'Property Intelligence') {
            return (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50">
                    <Building className="w-3 h-3 mr-1" />
                    Property Intelligence
                </Badge>
            );
        }
        return null;
    };

    return (
        <div className="space-y-3">
            {updates.map((update) => (
                <div
                    key={update.id}
                    className="group p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Title and impact badge */}
                            <div className="flex items-start gap-2 mb-2 flex-wrap">
                                <h3 className="font-medium text-slate-900 dark:text-titanium-100 text-sm leading-tight flex-1">
                                    {update.title}
                                </h3>
                            </div>

                            {/* Summary */}
                            <p className="text-sm text-slate-500 dark:text-titanium-400 line-clamp-2">
                                {update.summary}
                            </p>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                                <Badge variant="outline" className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-titanium-300">
                                    {update.category}
                                </Badge>
                                <span className="text-slate-400 dark:text-titanium-500">•</span>
                                <span className="text-slate-400 dark:text-titanium-500">{update.date}</span>
                                {update.impact_label && (
                                    <>
                                        <span className="text-slate-400 dark:text-titanium-500">•</span>
                                        {getImpactBadge(update.impact_label)}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Read More button */}
                        <a
                            href={update.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-slate-700 dark:text-titanium-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                            >
                                <span>Read More</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </a>
                    </div>
                </div>
            ))}

            {/* Source attribution */}
            <p className="text-center text-[10px] text-slate-400 dark:text-titanium-600 pt-2">
                Source: cd4.lacity.gov • Councilmember Nithya Raman, District 4
            </p>
        </div>
    );
}
