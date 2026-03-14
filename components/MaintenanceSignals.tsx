'use client';

import { useEffect, useState } from 'react';
import { CircleAlert as AlertCircle, Clock, MapPin, CircleCheck as CheckCircle2, Cone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FeedItem {
    type: string;
    location: string;
    count: number;
    latest_date: string;
    status: string;
}

interface SignalData {
    period: string;
    total_requests: number;
    top_types: { type: string; count: number }[];
    open_count: number;
    closed_count: number;
    median_closure_hours: number;
    hotspots: FeedItem[];
    status?: string;
    updated_at: string;
    trend?: string;
}

export function MaintenanceSignals() {
    const [data, setData] = useState<SignalData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/maintenance-signals');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load maintenance signals', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading || !data) return null;

    const hasData = data.total_requests > 0;
    const isError = !hasData && (data.status?.includes('Unavailable') || data.status?.includes('Pending'));

    // Trend Logic
    const trend = data.trend || "Stable";
    const isUp = trend.includes("Up");
    const isDown = trend.includes("Down");
    const trendColor = isUp ? "text-orange-500" : isDown ? "text-emerald-500" : "text-slate-400";

    // Widget Status Logic — elevated when trend is rising or data unavailable
    const isElevated = isUp || (!!data.status?.includes('Unavailable'));
    const StatusIcon = isElevated ? AlertCircle : CheckCircle2;

    return (
        <Card className="border-border bg-panel shadow-soft overflow-hidden">
            <div className={`h-1 w-full ${isElevated ? 'bg-alert' : 'bg-safe'}`} />
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isElevated ? 'bg-alert/10' : 'bg-safe/10'}`}>
                            <StatusIcon className={`w-5 h-5 ${isElevated ? 'text-alert' : 'text-safe'}`} />
                        </div>
                        <h3 className="font-medium text-ink">
                            Maintenance Signals
                        </h3>
                    </div>
                    <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium border ${isElevated ? 'bg-alert/5 text-alert border-alert/20' : 'bg-safe/5 text-safe border-safe/20'}`}>
                        {trend}
                    </Badge>
                </div>

                {/* Empty / Error State */}
                {isError && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md text-sm text-slate-500 mb-2">
                        <AlertCircle className="w-4 h-4 text-slate-400" />
                        <span>City Data Stream Unavailable</span>
                    </div>
                )}

                {hasData && (
                    <div className="space-y-4">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded flex flex-col items-center">
                                <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{data.total_requests}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[10px] font-medium ${trendColor}`}>{trend}</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Reqs</span>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{data.median_closure_hours}h</span>
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Avg Fix</span>
                            </div>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded flex flex-col items-center border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.closed_count}</span>
                                </div>
                                <span className="text-[10px] text-emerald-600/70 uppercase tracking-wider">Closed</span>
                            </div>
                        </div>

                        {/* Top Issues List */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Top Issues</h4>
                            <div className="space-y-1">
                                {data.top_types.slice(0, 3).map((t, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors">
                                        <span className="text-slate-700 dark:text-slate-300 truncate">{t.type}</span>
                                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono text-xs">
                                            {t.count}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hotspots / Feed */}
                        {data.hotspots.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                                <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Active Clusters
                                </h4>
                                <div className="space-y-2">
                                    {data.hotspots.slice(0, 3).map((h, i) => (
                                        <div key={i} className="flex gap-3 text-sm items-start">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                                            <div>
                                                <div className="font-medium text-slate-700 dark:text-slate-200">{h.type}</div>
                                                <div className="text-slate-500 text-xs">{h.location}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{h.count} reports • {new Date(h.latest_date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-3 text-[10px] text-slate-400 text-right">
                    Source: MyLA311
                </div>
            </CardContent>
        </Card>
    );
}
