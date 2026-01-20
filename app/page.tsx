import { supabaseServer } from '@/lib/supabase/server';
import { WeatherWidget, SystemStatusWidget } from '@/components/DashboardWidgets';
import { AtmosphericPulse } from '@/components/AtmosphericPulse';
import { PermitDashboard } from '@/components/PermitDashboard';
import { NeighborhoodFrictionDashboard } from '@/components/RoadWorkDashboard';
import { LegislativeSentinelDashboard } from '@/components/LegislativeSentinelDashboard';
import { UnifiedFeedDashboard } from '@/components/UnifiedFeedDashboard';
import { NeighborhoodFeedDashboard } from '@/components/NeighborhoodFeedDashboard';
import { SecurityBrief } from '@/components/SecurityBrief';
import { HillsLiveDashboard } from '@/components/HillsLiveDashboard';
import { ActivityIndex } from '@/components/ActivityIndex';
import { NeighborhoodSignals } from '@/components/NeighborhoodSignals';
import { MaintenanceSignals } from '@/components/MaintenanceSignals';
import { MarketIntel } from '@/components/MarketIntel';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { Terminal, Zap, Building2, TrafficCone, Landmark, Newspaper } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const area = await supabaseServer
    .from('areas')
    .select('id, name, slug')
    .eq('slug', 'hollywood-hills')
    .single();

  if (!area.data) {
    console.error("❌ Area Fetch Error:", area.error?.message || "No data returned");
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-titanium-900 text-slate-900 dark:text-titanium-50">
        <div className="text-center">
          <h1 className="text-2xl font-light mb-2">Area Not Found</h1>
          <p className="text-slate-500 dark:text-titanium-400">Hollywood Hills area has not been configured yet.</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-slate-50 dark:bg-transparent text-slate-900 dark:text-titanium-50 font-sans selection:bg-blue-500/30">
      {/* HUD Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-titanium-900/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-medium tracking-wide text-slate-900 dark:text-titanium-50">THE HILLS LEDGER</h1>
              <p className="text-[10px] text-slate-500 dark:text-titanium-400 uppercase tracking-widest">Decision Support Brief • {area.data.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/terminal">
              <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-titanium-300 transition-all">
                <Terminal className="w-4 h-4" />
                <span className="hidden sm:inline">Terminal</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">

        {/* Hills Live Dashboard - Hero Section */}
        <div className="mb-8">
          <HillsLiveDashboard />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Widgets (Weather, Status) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100">
                Conditions
              </h2>
            </div>
            <div className="h-64">
              <WeatherWidget />
            </div>
            {aqiProps && (
              <div>
                <AtmosphericPulse {...aqiProps} />
              </div>
            )}
            <div>
              <SystemStatusWidget />
            </div>
            <ActivityIndex />
            <NeighborhoodSignals />
          </div>

          {/* Middle Column: Unified Chronological Feed */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Live Updates
                <span className="text-slate-400 dark:text-titanium-500 text-sm font-normal">All Sources • Sorted by Recency</span>
              </h2>
            </div>

            <UnifiedFeedDashboard />

            {/* Market & Development - Permits & Real Estate */}
            <div className="flex items-center justify-between mb-2 px-2 mt-8 border-t border-slate-200 dark:border-white/5 pt-6">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Market & Development
                <span className="text-slate-400 dark:text-titanium-500 text-sm font-normal">Permits & Real Estate</span>
              </h2>
            </div>

            <div className="space-y-6">
              <MarketIntel />
              <PermitDashboard />
            </div>

            {/* Neighborhood Friction - StreetsLA Pavement & Road Work */}
            <div className="flex items-center justify-between mb-2 px-2 mt-8 border-t border-slate-200 dark:border-white/5 pt-6">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100 flex items-center gap-2">
                <TrafficCone className="w-5 h-5 text-amber-500" />
                Neighborhood Friction
                <span className="text-slate-400 dark:text-titanium-500 text-sm font-normal">Street Work & Delays</span>
              </h2>
            </div>

            <NeighborhoodFrictionDashboard />

            {/* Legislative Sentinel - CD4 Press Releases & Updates */}
            <div className="flex items-center justify-between mb-2 px-2 mt-8 border-t border-slate-200 dark:border-white/5 pt-6">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-500" />
                Legislative Sentinel
                <span className="text-slate-400 dark:text-titanium-500 text-sm font-normal">CD4 Updates</span>
              </h2>
            </div>

            <LegislativeSentinelDashboard />
          </div>

          {/* Right Column: Neighborhood Feed (Social Sentinel) */}
          <div className="lg:col-span-3 space-y-6">
            <SecurityBrief />
            <ActivityIndex />
            <MaintenanceSignals />

            <div className="flex items-center justify-between mb-2 px-2">
              <h2 className="text-lg font-medium text-slate-800 dark:text-titanium-100 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-cyan-500" />
                News Feed
              </h2>
            </div>
            <NeighborhoodFeedDashboard category="News Feed" limit={20} />
          </div>

        </div>
      </main>
    </div>
  );
}
