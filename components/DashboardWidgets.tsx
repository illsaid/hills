'use client';

import { Cloud, Wind, Droplets, ShieldCheck, Wifi, Battery, MapPin, Megaphone, Calendar, Construction, CheckCircle2, Loader2, Sun, CloudRain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function WeatherWidget() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWeather() {
            try {
                const res = await fetch('/api/cron/weather');
                const json = await res.json();
                if (json.success && json.weather) {
                    setData(json.weather);
                }
            } catch (e) {
                console.error("Weather fetch error", e);
            } finally {
                setLoading(false);
            }
        }
        fetchWeather();
    }, []);

    const temp = data?.temp || "--";
    const condition = data?.condition || "Loading...";
    const wind = data?.windSpeed || "--";
    const humidity = data?.humidity !== undefined ? `${data.humidity}%` : "--";

    // Simple icon mapping
    const isRain = condition.toLowerCase().includes('rain');
    const isSunny = condition.toLowerCase().includes('sunny') || condition.toLowerCase().includes('clear');
    const Icon = isRain ? CloudRain : (isSunny ? Sun : Cloud);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm transition-all dark:border-white/10 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 dark:backdrop-blur-md dark:shadow-none p-6 md:p-7 group h-full w-full text-slate-900 dark:text-titanium-50">
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 dark:text-titanium-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Hollywood Hills
                    </span>
                    {loading ? (
                        <div className="mt-4 h-12 flex items-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : (
                        <h2 className="text-5xl font-light mt-4 tracking-tighter">{temp}°</h2>
                    )}
                    <span className="text-slate-600 dark:text-titanium-200 mt-1 font-medium">{condition}</span>
                </div>
                <Icon className="w-16 h-16 text-slate-400 dark:text-titanium-200 opacity-80" />
            </div>

            <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between text-sm border-t border-slate-100 dark:border-white/5 pt-3">
                    <span className="text-slate-500 dark:text-titanium-400 flex items-center gap-2"><Wind className="w-4 h-4" /> Wind</span>
                    <span className="font-medium">NE {wind}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-slate-100 dark:border-white/5 pt-3">
                    <span className="text-slate-500 dark:text-titanium-400 flex items-center gap-2"><Droplets className="w-4 h-4" /> Humidity</span>
                    <span className="font-medium">{humidity}</span>
                </div>
            </div>

            {/* Decorative gradient blob for dark mode only */}
            <div className="hidden dark:block absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
        </div>
    );
}

export function SystemStatusWidget() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md p-5 h-full w-full flex flex-col justify-center items-center text-center">
            <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-full mb-2 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-titanium-50 text-base">System Operational</h3>
            <p className="text-xs text-slate-500 dark:text-titanium-400 mt-0.5">All monitoring systems active</p>
        </div>
    );
}

export function CommunityUpdatesWidget() {
    return (
        <div className="space-y-4 w-full h-full">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md p-5 w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                        <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-titanium-50">HOA Announcements</h3>
                </div>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="text-sm font-medium text-slate-800 dark:text-titanium-100 truncate">Quarterly Meeting</span>
                            <span className="text-[10px] text-slate-500 dark:text-titanium-400 bg-white dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-100 dark:border-transparent whitespace-nowrap">Nov 15</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-titanium-400 line-clamp-2">Agenda includes landscaping budget and security gate upgrades.</p>
                    </div>
                </div>
                <Button variant="ghost" className="w-full mt-3 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-titanium-300 dark:hover:text-white dark:hover:bg-white/5 h-8">
                    View All Announcements
                </Button>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md p-5 w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20">
                        <Construction className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-titanium-50">Infrastructure</h3>
                </div>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="text-sm font-medium text-slate-800 dark:text-titanium-100 truncate">Paving Schedule</span>
                            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/10 whitespace-nowrap">Alert</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-titanium-400 line-clamp-2">Main Street resurfacing begins next Monday. Expect delays.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
