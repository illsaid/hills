'use client';

import { useEffect, useState } from 'react';
import { Shield, TrendingDown, TrendingUp, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [detailsOpen, setDetailsOpen] = useState(false);

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
    const StatusIcon = isElevated ? AlertTriangle : Shield;
    const accentColor = isElevated ? 'blue-500' : 'blue-500'; // Unified blue

    const paragraphs = data.brief_text?.split('\n').filter(p => p.trim().length > 0) || [];
    const contextLines = paragraphs.slice(1);

    return (
        <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden h-full">
            <div className="h-1 w-full bg-blue-500" />
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            Crime Brief
                        </h3>
                    </div>
                    <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium border ${isElevated ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'}`}>
                        {data.status}
                    </Badge>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Incidents</div>
                        <div className="font-bold text-lg text-slate-900 dark:text-white">{data.stats.total}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vs Week</div>
                        <TrendIndicator value={data.stats.wow_change} />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vs Year</div>
                        <TrendIndicator value={data.stats.yoy_change} />
                    </div>
                </div>

                {/* Collapsible Details */}
                <button
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                    <span>Incident Breakdown</span>
                    {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {detailsOpen && (
                    <div className="mt-3 space-y-2 text-sm animate-in slide-in-from-top-2 duration-200">
                        {contextLines.map((p, i) => (
                            <p key={i} className="leading-relaxed text-slate-600 dark:text-slate-400">
                                {p.split('**').map((part, idx) =>
                                    idx % 2 === 1 ? <span key={idx} className="font-medium text-slate-900 dark:text-slate-200">{part}</span> : part
                                )}
                            </p>
                        ))}
                        {data.breakdown && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                                    <div className="text-xs text-blue-600 dark:text-blue-400">Vehicle</div>
                                    <div className="font-bold text-blue-700 dark:text-blue-300">{data.breakdown.vehicle || 0}%</div>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                                    <div className="text-xs text-blue-600 dark:text-blue-400">Residential</div>
                                    <div className="font-bold text-blue-700 dark:text-blue-300">{data.breakdown.residential || 0}%</div>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                                    <div className="text-xs text-blue-600 dark:text-blue-400">Other</div>
                                    <div className="font-bold text-blue-700 dark:text-blue-300">{data.breakdown.other || 0}%</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {new Date(data.updated_at).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendIndicator({ value }: { value: number }) {
    if (value === 0) return <div className="font-semibold text-slate-500">—</div>;

    const isGood = value < 0;
    const Icon = value < 0 ? TrendingDown : TrendingUp;

    return (
        <div className={`flex items-center justify-center gap-1 font-bold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(value)}%
        </div>
    );
}
