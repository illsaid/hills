'use client';

import { useEffect, useState } from 'react';
import { Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Activity, Phone, Wind } from 'lucide-react';

interface PulseData {
    crimeStatus: 'normal' | 'elevated';
    crimeChange: number;
    noiseLevel: string;
    openTickets: number;
    aqiValue: number;
}

export function NeighborhoodPulse() {
    const [data, setData] = useState<PulseData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAll() {
            try {
                const [securityRes, activityRes, maintenanceRes, aqiRes] = await Promise.all([
                    fetch('/api/security-brief').then(r => r.ok ? r.json() : null),
                    fetch('/api/activity-index').then(r => r.ok ? r.json() : null),
                    fetch('/api/maintenance-signals').then(r => r.ok ? r.json() : null),
                    fetch('/api/environmental-sync').then(r => r.ok ? r.json() : null),
                ]);

                setData({
                    crimeStatus: securityRes?.status === 'ELEVATED' ? 'elevated' : 'normal',
                    crimeChange: securityRes?.stats?.wow_change || 0,
                    noiseLevel: activityRes?.activity_status || 'NORMAL',
                    openTickets: maintenanceRes?.open_count || maintenanceRes?.total_requests || 0,
                    aqiValue: aqiRes?.avg_aqi ?? 78,
                });
            } catch (e) {
                console.error('Failed to fetch pulse data', e);
            } finally {
                setLoading(false);
            }
        }
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-24 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl animate-pulse" />
        );
    }

    if (!data) return null;

    const isAllClear = data.crimeStatus === 'normal' && data.noiseLevel !== 'VERY HIGH';
    const statusColor = isAllClear
        ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'
        : 'from-amber-500/10 to-amber-500/5 border-amber-500/20';
    const StatusIcon = isAllClear ? CheckCircle : AlertTriangle;
    const statusText = isAllClear ? 'All Clear' : 'Elevated Activity';
    const statusTextColor = isAllClear ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400';

    const crimeText = data.crimeChange === 0
        ? 'Crime is stable'
        : data.crimeChange < 0
            ? `Crime is ${Math.abs(data.crimeChange)}% below average`
            : `Crime is ${data.crimeChange}% above average`;

    const aqiText = data.aqiValue <= 50 ? 'Good' : data.aqiValue <= 100 ? 'Moderate' : 'Unhealthy';

    return (
        <div className={`w-full rounded-2xl border bg-gradient-to-r ${statusColor} p-6`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isAllClear ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                        <StatusIcon className={`w-6 h-6 ${statusTextColor}`} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-semibold ${statusTextColor}`}>
                            Hollywood Hills: {statusText}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {crimeText}. Air quality is {aqiText.toLowerCase()}. {data.openTickets} open 311 tickets.
                        </p>
                    </div>
                </div>

                {/* Quick Stats Pills */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{data.crimeStatus === 'elevated' ? 'Elevated' : 'Normal'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{data.noiseLevel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{data.openTickets} 311</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                        <Wind className="w-3.5 h-3.5" />
                        <span>AQI {data.aqiValue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
