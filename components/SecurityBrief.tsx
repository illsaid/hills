'use client';

import { useEffect, useState } from 'react';
import { Shield, TrendingDown, TrendingUp, TriangleAlert as AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SecurityStats {
    total: number;
    wow_change: number;
    yoy_change: number;
}

interface SecurityData {
    status: 'NORMAL' | 'ELEVATED';
    color: string;
    brief_text: string;
    updated_at: string;
    analysis_week?: string;
    stats: SecurityStats;
    breakdown?: {
        vehicle?: number;
        residential?: number;
        other?: number;
    };
}

export function SecurityBrief() {
    const [data, setData] = useState<SecurityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBrief() {
            try {
                const res = await fetch('/api/security-brief');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load security brief', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBrief();
    }, []);

    if (loading) return <div className="animate-pulse h-64 bg-slate-50 dark:bg-white/5 rounded-2xl" />;
    if (!data) return null;

    const isElevated = data.status === 'ELEVATED';

    const paragraphs = (data.brief_text || '')
        .split('\n')
        .filter(p => p.trim().length > 0)
        .filter(p => !p.startsWith('**SECURITY BRIEF'));

    return (
        <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden h-full">
            <div className={`h-1 w-full ${isElevated ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        {isElevated
                            ? <AlertTriangle className="w-5 h-5 text-amber-500" />
                            : <Shield className="w-5 h-5 text-emerald-500" />
                        }
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">Crime Brief</h3>
                    </div>
                    <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-0.5 font-medium border ${
                            isElevated
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                        }`}
                    >
                        {data.status}
                    </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Incidents</div>
                        <div className="font-bold text-lg text-slate-900 dark:text-white">{data.stats.total}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vs Last Week</div>
                        <TrendIndicator value={data.stats.wow_change} />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vs Last Year</div>
                        <TrendIndicator value={data.stats.yoy_change} />
                    </div>
                </div>

                {paragraphs.length > 0 && (
                    <div className="space-y-2">
                        {paragraphs.map((p, i) => (
                            <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {p.split('**').map((part, idx) =>
                                    idx % 2 === 1
                                        ? <span key={idx} className="font-medium text-slate-800 dark:text-slate-200">{part}</span>
                                        : part
                                )}
                            </p>
                        ))}
                    </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
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

function TrendIndicator({ value }: { value: number }) {
    if (value === 0) return <div className="font-semibold text-slate-400 dark:text-slate-500 text-lg">—</div>;

    const isGood = value < 0;
    const Icon = value < 0 ? TrendingDown : TrendingUp;

    return (
        <div className={`flex items-center justify-center gap-1 font-bold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(value)}%
        </div>
    );
}
