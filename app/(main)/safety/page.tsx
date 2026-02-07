export const dynamic = 'force-dynamic';

import { HillsLiveDashboard } from '@/components/HillsLiveDashboard';
import { NeighborhoodSignals } from '@/components/NeighborhoodSignals';
import { AtmosphericPulse } from '@/components/AtmosphericPulse';
import { SecurityBrief } from '@/components/SecurityBrief';
import { ActivityIndex } from '@/components/ActivityIndex';
import { NeighborhoodPulse } from '@/components/NeighborhoodPulse';
import { supabaseServer } from '@/lib/supabase/server';
import { Activity, Wind, Flame } from 'lucide-react';
import Link from 'next/link';

export default async function SafetyPage() {
    // Fetch AQI Data
    const aqiData = await supabaseServer
        .from('neighborhood_intel')
        .select('*')
        .eq('source_name', 'Google AQI')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const aqiProps = aqiData.data ? {
        avgAQI: aqiData.data.metadata?.avg_aqi || 0,
        locations: aqiData.data.metadata?.locations || [],
        spikeDetected: aqiData.data.metadata?.spike_detected || false,
        dominantPollutant: aqiData.data.description?.split('Dominant: ')[1]?.replace('.', '') || 'Unknown',
        lastUpdated: aqiData.data.published_at || new Date().toISOString()
    } : null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-light text-slate-900 dark:text-titanium-50 mb-2">
                    Public Safety and Civic Reports
                </h1>
                <p className="text-lg text-slate-500 dark:text-titanium-400 max-w-2xl">
                    Real-time monitoring of community safety, crime trends, and environmental hazards.
                </p>
            </div>

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
