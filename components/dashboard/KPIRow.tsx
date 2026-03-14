'use client';

import { Wind, Thermometer, TriangleAlert as AlertTriangle } from 'lucide-react';

interface KPIRowProps {
    aqi: {
        value: number;
        status: string;
        updatedAt?: string; // ISO timestamp
    };
    weather?: {
        temp: number;
        condition: string;
        high: number;
        low: number;
        wind?: string;
    };
    openCases?: number;
}

export function KPIRow({ aqi, weather, openCases }: KPIRowProps) {
    const getAqiColor = (value: number) => {
        if (value <= 50) return { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' };
        if (value <= 100) return { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' };
        return { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' };
    };

    const aqiColors = getAqiColor(aqi.value);

    const formatUpdatedTime = (isoDate?: string) => {
        if (!isoDate) return '—';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return '—';
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            {/* Air Quality */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Air Quality</span>
                    </div>
                    <span className={`px-2 py-1 ${aqiColors.bg} ${aqiColors.text} text-xs font-semibold rounded-full`}>
                        {aqi.status}
                    </span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{aqi.value}</span>
                    <span className="text-sm text-slate-500 mb-1">AQI</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                    <div className={`${aqiColors.bar} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min((aqi.value / 200) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Updated {formatUpdatedTime(aqi.updatedAt)}
                </p>
            </div>

            {/* Weather */}
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Weather</span>
                    </div>
                    <span className="text-xs text-slate-500">Hollywood Hills</span>
                </div>
                {weather ? (
                    <>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{weather.temp}°</span>
                            <span className="text-sm text-slate-500 mb-1">{weather.condition}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>H: {weather.high}°</span>
                            <span>L: {weather.low}°</span>
                            {weather.wind && <span>Wind: {weather.wind}</span>}
                        </div>
                    </>
                ) : (
                    <div className="text-slate-400 dark:text-slate-500 text-sm">Weather data unavailable</div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {weather ? 'NWS — National Weather Service' : ''}
                </p>
            </div>

            {/* Open Cases (optional, shown on wide screens) */}
            {openCases !== undefined && (
                <div className="hidden 2xl:block bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Open Cases</span>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{openCases}</span>
                        <span className="text-sm text-slate-500 mb-1">active</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Code enforcement, permits</p>
                </div>
            )}
        </div>
    );
}
