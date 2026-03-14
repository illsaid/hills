export const dynamic = 'force-dynamic';

import { HillsLiveDashboard } from '@/components/HillsLiveDashboard';
import { NeighborhoodSignals } from '@/components/NeighborhoodSignals';
import { AtmosphericPulse } from '@/components/AtmosphericPulse';
import { SecurityBrief } from '@/components/SecurityBrief';
import { ActivityIndex } from '@/components/ActivityIndex';
import { NeighborhoodPulse } from '@/components/NeighborhoodPulse';
import { supabaseServer } from '@/lib/supabase/server';
import { Activity, Wind, Flame, TriangleAlert, Shield, ExternalLink } from 'lucide-react';
import Link from 'next/link';

function formatAge(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days <= 6) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function SafetyPage() {
    const [aqiData, alertsData] = await Promise.all([
        supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .eq('source_name', 'Google AQI')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabaseServer
            .from('neighborhood_intel')
            .select('*')
            .eq('category', 'Safety')
            .order('published_at', { ascending: false })
            .limit(20),
    ]);

    const aqiProps = aqiData.data ? {
        avgAQI: aqiData.data.metadata?.avg_aqi || 0,
        locations: aqiData.data.metadata?.locations || [],
        spikeDetected: aqiData.data.metadata?.spike_detected || false,
        dominantPollutant: aqiData.data.description?.split('Dominant: ')[1]?.replace('.', '') || 'Unknown',
        lastUpdated: aqiData.data.published_at || new Date().toISOString()
    } : null;

    const alerts = alertsData.data || [];
    const criticalAlerts = alerts.filter((a) => (a.priority ?? 3) <= 2);
    const otherAlerts = alerts.filter((a) => (a.priority ?? 3) > 2);

    const getSeverityStyle = (priority: number) => {
        if (priority === 1) return {
            border: 'border-red-200 dark:border-red-500/30',
            bg: 'bg-red-50 dark:bg-red-500/10',
            icon: 'text-red-500',
            badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
            badgeText: 'Critical',
        };
        if (priority === 2) return {
            border: 'border-amber-200 dark:border-amber-500/30',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            icon: 'text-amber-500',
            badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
            badgeText: 'Warning',
        };
        return {
            border: 'border-blue-200 dark:border-blue-500/30',
            bg: 'bg-blue-50 dark:bg-blue-500/5',
            icon: 'text-blue-500',
            badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
            badgeText: 'Info',
        };
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-light text-slate-900 dark:text-titanium-50 mb-2">
                    Public Safety and Civic Reports
                </h1>
                <p className="text-base md:text-lg text-slate-500 dark:text-titanium-400 max-w-2xl">
                    Real-time monitoring of community safety, crime trends, and environmental hazards.
                </p>
            </div>

            {/* Active Alerts — anchor target for dashboard chips */}
            <section id="alerts" className="scroll-mt-20">
                <div className="flex items-center gap-2 mb-4">
                    <TriangleAlert className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-medium text-slate-900 dark:text-titanium-50">
                        Active Alerts
                    </h2>
                    {alerts.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {alerts.length}
                        </span>
                    )}
                </div>

                {alerts.length === 0 ? (
                    <div className="flex items-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-emerald-700 dark:text-emerald-400">
                        <Shield className="w-5 h-5 shrink-0" />
                        <div>
                            <div className="font-medium">All clear</div>
                            <div className="text-sm opacity-75">No active safety alerts for the Hollywood Hills area.</div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...criticalAlerts, ...otherAlerts].map((alert) => {
                            const style = getSeverityStyle(alert.priority ?? 3);
                            const url = alert.source_url?.startsWith('http') ? alert.source_url
                                : alert.url?.startsWith('http') ? alert.url : null;

                            return (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-2xl border ${style.border} ${style.bg}`}
                                >
                                    <div className="flex items-start justify-between gap-2 md:gap-4">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`mt-0.5 shrink-0 ${style.icon}`}>
                                                {(alert.priority ?? 3) === 1 ? (
                                                    <Flame className="w-4 h-4" />
                                                ) : (
                                                    <TriangleAlert className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                                                        {style.badgeText}
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {formatAge(alert.published_at || alert.created_at)}
                                                    </span>
                                                    {alert.source_name && (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                                            via {alert.source_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-slate-900 dark:text-titanium-50 leading-snug">
                                                    {alert.title}
                                                </p>
                                                {alert.description && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                        {alert.description}
                                                    </p>
                                                )}
                                                {alert.location && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                                                        {alert.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {url && (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Row 1: Neighborhood Pulse Summary (Full Width) */}
            <NeighborhoodPulse />

            {/* Row 2: Primary Metrics (Crime + Noise) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SecurityBrief />
                <ActivityIndex />
            </div>

            {/* Row 3: Supporting Context (311 + AQI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-medium text-slate-900 dark:text-titanium-50">
                            311 Reports
                        </h2>
                    </div>
                    <NeighborhoodSignals />
                </div>

                {aqiProps && (
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Wind className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-medium text-slate-900 dark:text-titanium-50">
                                Air Quality
                            </h2>
                        </div>
                        <AtmosphericPulse {...aqiProps} />
                    </div>
                )}
            </div>

            {/* Row 4: Fire/Safety Dashboard (Collapsible) */}
            <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="font-medium text-slate-900 dark:text-titanium-50">Fire & Safety Dispatch</span>
                    </div>
                    <span className="text-xs text-slate-400 group-open:hidden">Click to expand</span>
                </summary>
                <div className="mt-4">
                    <HillsLiveDashboard />
                </div>
            </details>

            <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-white/5">
                <Link
                    href="/"
                    className="text-sm text-slate-500 dark:text-titanium-500 hover:text-slate-900 dark:hover:text-titanium-300 transition-colors"
                >
                    Back to Executive Briefing
                </Link>
            </div>
        </div>
    );
}
