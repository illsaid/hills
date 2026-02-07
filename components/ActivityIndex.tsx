'use client';

import { useEffect, useState } from 'react';
import { Activity, Volume2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ActivityData {
    activity_status: 'QUIET' | 'NORMAL' | 'HIGH' | 'VERY HIGH';
    brief_text: string;
    updated_at: string;
    total_calls: number;
    call_breakdown: Record<string, number>;
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

    if (loading) return <div className="animate-pulse h-48 bg-slate-50 dark:bg-white/5 rounded-2xl" />;
    if (!data) return null;

    // Map status to gauge percentage
    const getGaugePercent = (status: string) => {
        switch (status) {
            case 'QUIET': return 20;
            case 'NORMAL': return 45;
            case 'HIGH': return 70;
            case 'VERY HIGH': return 95;
            default: return 50;
        }
    };

    const getGaugeColor = (status: string) => {
        switch (status) {
            case 'QUIET': return 'stroke-emerald-500';
            case 'NORMAL': return 'stroke-blue-500';
            case 'HIGH': return 'stroke-amber-500';
            case 'VERY HIGH': return 'stroke-red-500';
            default: return 'stroke-slate-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'QUIET': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
            case 'NORMAL': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
            case 'HIGH': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
            case 'VERY HIGH': return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
            default: return 'bg-slate-50 text-slate-600';
        }
    };

    const percent = getGaugePercent(data.activity_status);
    const gaugeColor = getGaugeColor(data.activity_status);
    const statusBg = getStatusBg(data.activity_status);

    // SVG arc calculation
    const radius = 45;
    const circumference = Math.PI * radius; // Half circle
    const dashOffset = circumference - (percent / 100) * circumference;

    return (
        <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden h-full">
            <CardContent className="p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Volume2 className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">Noise Level</h3>
                </div>

                {/* Gauge */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative w-32 h-16 mb-3">
                        <svg className="w-32 h-16 transform -scale-y-100" viewBox="0 0 100 50">
                            {/* Background arc */}
                            <path
                                d="M 5 50 A 45 45 0 0 1 95 50"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-200 dark:text-slate-700"
                            />
                            {/* Filled arc */}
                            <path
                                d="M 5 50 A 45 45 0 0 1 95 50"
                                fill="none"
                                strokeWidth="8"
                                strokeLinecap="round"
                                className={gaugeColor}
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            />
                        </svg>
                        {/* Center label */}
                        <div className="absolute inset-0 flex items-end justify-center pb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBg}`}>
                                {data.activity_status}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-[180px]">
                        {data.brief_text}
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Active Calls</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{data.total_calls}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
