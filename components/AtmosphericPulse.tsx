'use client';

import { Cloud, Wind, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AQILocation {
    zip: string;
    aqi: number;
    pollutant: string;
    category: string;
}

interface AtmosphericPulseProps {
    avgAQI: number;
    locations: AQILocation[];
    spikeDetected: boolean;
    dominantPollutant: string;
    lastUpdated: string;
}

function getAQIColor(aqi: number) {
    if (aqi <= 50) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (aqi <= 100) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (aqi <= 150) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-rose-600 bg-rose-600/10 border-rose-600/20 animate-pulse';
}

function getAQILabel(aqi: number) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sens.)';
    return 'Unhealthy';
}

export function AtmosphericPulse({ avgAQI, locations, spikeDetected, dominantPollutant, lastUpdated }: AtmosphericPulseProps) {
    if (!locations || locations.length === 0) return null;

    return (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-500 dark:text-titanium-400 flex items-center gap-2">
                    <Wind className="w-4 h-4" />
                    Canyon Breathe
                </h3>
                {spikeDetected && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        SPIKE DETECTED
                    </span>
                )}
            </div>

            <div className="flex items-center justify-center py-2">
                <div className="relative">
                    {/* Main Pulse Ring */}
                    <div className={cn(
                        "w-32 h-32 rounded-full flex flex-col items-center justify-center border-4",
                        getAQIColor(avgAQI).replace('border-', 'border-')
                    )}>
                        <span className="text-3xl font-bold text-slate-700 dark:text-titanium-100">
                            {avgAQI}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-titanium-400">
                            {getAQILabel(avgAQI)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {locations.map((loc) => (
                    <div key={loc.zip} className="text-center p-2 rounded-lg bg-slate-50 dark:bg-white/5">
                        <div className="text-[10px] text-slate-400 dark:text-titanium-500 mb-1">{loc.zip}</div>
                        <div className={cn("text-lg font-bold", getAQIColor(loc.aqi).split(' ')[0])}>
                            {loc.aqi}
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-[10px] text-center text-slate-400 dark:text-titanium-500 border-t border-slate-100 dark:border-white/5 pt-3">
                Dominant: <span className="font-medium text-slate-600 dark:text-titanium-300">{dominantPollutant}</span>
                <span className="mx-2">•</span>
                Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
}
