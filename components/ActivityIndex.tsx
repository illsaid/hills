'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingDown, TrendingUp, Calendar, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityData {
    activity_status: 'QUIET' | 'NORMAL' | 'ELEVATED' | 'PENDING';
    status_color: string;
    total_calls: number;
    wow_change: number;
    vs_baseline: number;
    call_breakdown: Record<string, number>;
    brief_text: string;
    updated_at: string;
}

export function ActivityIndex() {
    const [data, setData] = useState<ActivityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchActivity() {
            try {
                const res = await fetch('/api/activity-index');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load activity index', error);
            } finally {
                setLoading(false);
            }
        }
        fetchActivity();
    }, []);

    if (loading || !data || data.activity_status === 'PENDING') return null;

    const statusColors: Record<string, { bg: string; text: string; border: string; bar: string }> = {
        QUIET: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500' },
        NORMAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
        ELEVATED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' }
    };

    const colors = statusColors[data.activity_status] || statusColors.NORMAL;

    // Parse brief text for display
    const paragraphs = data.brief_text.split('\n').filter(p => p.trim().length > 0);
    const contextLines = paragraphs.slice(1); // Skip header

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className={`h-1 w-full ${colors.bar}`} />
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-slate-500" />
                        <h3 className="font-semibold text-slate-800 dark:text-titanium-100">
                            Activity Index
                        </h3>
                    </div>
                    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                        {data.activity_status}
                    </Badge>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Calls</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{data.total_calls}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Vs Week</div>
                        <TrendIndicator value={data.wow_change} />
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Vs Avg</div>
                        <TrendIndicator value={data.vs_baseline} />
                    </div>
                </div>

                {/* Call Breakdown */}
                {Object.keys(data.call_breakdown || {}).length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-medium text-slate-500 mb-2">Call Breakdown</div>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(data.call_breakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, count]) => (
                                    <span
                                        key={type}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    >
                                        {type}: {count}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Context */}
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {contextLines.slice(-2).map((p, i) => (
                        <p key={i} className="leading-relaxed">
                            {p.split('**').map((part, idx) =>
                                idx % 2 === 1 ? <span key={idx} className="font-medium text-slate-900 dark:text-white">{part}</span> : part
                            )}
                        </p>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {new Date(data.updated_at).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendIndicator({ value }: { value: number }) {
    if (value === 0) return <div className="font-semibold text-slate-500">-</div>;

    // For calls, up is concerning (amber), down is quieter (green)
    const isQuieter = value < 0;
    const color = isQuieter ? 'text-emerald-600' : 'text-amber-600';
    const Icon = value < 0 ? TrendingDown : TrendingUp;

    return (
        <div className={`flex items-center justify-center gap-1 font-bold ${color}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(value)}%
        </div>
    );
}
