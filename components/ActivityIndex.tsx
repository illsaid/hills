'use client';

import { useEffect, useState } from 'react';
import { PhoneCall, Calendar, CircleAlert as AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityData {
    activity_status: 'QUIET' | 'NORMAL' | 'HIGH' | 'VERY HIGH';
    brief_text: string;
    updated_at: string;
    analysis_week?: string;
    total_calls: number;
    call_breakdown: Record<string, number>;
    vs_baseline?: number;
    baseline_avg?: number;
    wow_change?: number;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; barColor: string; topColor: string }> = {
    QUIET: {
        label: 'Quiet',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        barColor: 'bg-emerald-500',
        topColor: 'bg-emerald-500',
    },
    NORMAL: {
        label: 'Normal',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
        barColor: 'bg-blue-500',
        topColor: 'bg-blue-500',
    },
    HIGH: {
        label: 'High',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
        barColor: 'bg-amber-500',
        topColor: 'bg-amber-500',
    },
    'VERY HIGH': {
        label: 'Very High',
        badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        barColor: 'bg-red-500',
        topColor: 'bg-red-500',
    },
};

function isStale(updatedAt: string, thresholdDays = 30): boolean {
    const updated = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    return diffMs > thresholdDays * 24 * 60 * 60 * 1000;
}

export function ActivityIndex() {
    const [data, setData] = useState<ActivityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/activity-index');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch activity index', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <div className="animate-pulse h-64 bg-slate-50 dark:bg-white/5 rounded-2xl" />;
    if (!data) return null;

    const config = STATUS_CONFIG[data.activity_status] || STATUS_CONFIG.NORMAL;
    const stale = isStale(data.updated_at);

    const breakdown = data.call_breakdown || {};
    const breakdownEntries = Object.entries(breakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    const maxCount = breakdownEntries.length > 0 ? Math.max(...breakdownEntries.map(([, v]) => v)) : 1;

    const paragraphs = (data.brief_text || '')
        .split('\n')
        .filter(p => p.trim().length > 0)
        .filter(p => !p.startsWith('**ACTIVITY INDEX'));

    return (
        <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden h-full">
            <div className={`h-1 w-full ${config.topColor}`} />
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <PhoneCall className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">Security Calls</h3>
                    </div>
                    <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium border ${config.badgeClass}`}>
                        {config.label}
                    </Badge>
                </div>

                {stale && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                            Data reflects {new Date(data.updated_at).toLocaleDateString()} — awaiting fresh ingest
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Calls</div>
                        <div className="font-bold text-lg text-slate-900 dark:text-white">{data.total_calls}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vs 8-wk Avg</div>
                        {data.vs_baseline !== undefined ? (
                            <div className={`font-bold text-lg ${data.vs_baseline < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {data.vs_baseline > 0 ? '+' : ''}{Math.round(data.vs_baseline)}%
                            </div>
                        ) : (
                            <div className="font-semibold text-slate-400 dark:text-slate-500 text-lg">—</div>
                        )}
                    </div>
                </div>

                {breakdownEntries.length > 0 && (
                    <div className="space-y-2.5 mb-4">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Call Types</div>
                        {breakdownEntries.map(([type, count]) => {
                            const pct = Math.round((count / (data.total_calls || 1)) * 100);
                            const barWidth = Math.round((count / maxCount) * 100);
                            return (
                                <div key={type}>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{type}</span>
                                        <span className="text-slate-500 dark:text-slate-500 ml-2 shrink-0">{count} <span className="text-slate-400">({pct}%)</span></span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${config.barColor} transition-all duration-500`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {paragraphs.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                        {paragraphs.map((p, i) => (
                            <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {p.replace(/^\*|\*$/g, '').split('**').map((part, idx) =>
                                    idx % 2 === 1
                                        ? <span key={idx} className="font-medium text-slate-800 dark:text-slate-200">{part}</span>
                                        : part
                                )}
                            </p>
                        ))}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Updated {new Date(data.updated_at).toLocaleDateString()}</span>
                    </div>
                    {data.analysis_week && (
                        <span>Week of {data.analysis_week}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
