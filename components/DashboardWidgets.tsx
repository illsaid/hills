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
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel shadow-soft p-6 md:p-7 group h-full w-full text-ink">
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink-muted flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Hollywood Hills
                    </span>
                    {loading ? (
                        <div className="mt-4 h-12 flex items-center"><Loader2 className="w-8 h-8 animate-spin text-ink-muted" /></div>
                    ) : (
                        <h2 className="text-5xl font-light mt-4 tracking-tighter text-ink">{temp}°</h2>
                    )}
                    <span className="text-ink font-medium mt-1">{condition}</span>
                </div>
                <Icon className="w-16 h-16 text-ink-muted/30" />
            </div>

            <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                    <span className="text-ink-muted flex items-center gap-2"><Wind className="w-4 h-4" /> Wind</span>
                    <span className="font-medium text-ink">NE {wind}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-border pt-3">
                    <span className="text-ink-muted flex items-center gap-2"><Droplets className="w-4 h-4" /> Humidity</span>
                    <span className="font-medium text-ink">{humidity}</span>
                </div>
            </div>
        </div>
    );
}

export function SystemStatusWidget() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel shadow-soft p-5 h-full w-full flex flex-col justify-center items-center text-center">
            <div className="bg-safe/10 p-2.5 rounded-full mb-2 ring-1 ring-safe/20">
                <CheckCircle2 className="w-5 h-5 text-safe" />
            </div>
            <h3 className="font-medium text-ink text-base">System Operational</h3>
            <p className="text-xs text-ink-muted mt-0.5">All monitoring systems active</p>
        </div>
    );
}

export function CommunityUpdatesWidget() {
    return (
        <div className="space-y-4 w-full h-full">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-panel shadow-soft p-5 w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                        <Megaphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-ink">HOA Announcements</h3>
                </div>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-canvas border border-border/50 transition-colors hover:bg-slate-100/50 cursor-pointer">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="text-sm font-medium text-ink truncate">Quarterly Meeting</span>
                            <span className="text-[10px] text-ink-muted bg-panel px-1.5 py-0.5 rounded border border-border whitespace-nowrap">Nov 15</span>
                        </div>
                        <p className="text-xs text-ink-muted line-clamp-2">Agenda includes landscaping budget and security gate upgrades.</p>
                    </div>
                </div>
                <Button variant="ghost" className="w-full mt-3 text-xs text-ink-muted hover:text-ink hover:bg-canvas h-8">
                    View All Announcements
                </Button>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-panel shadow-soft p-5 w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <Construction className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-medium text-ink">Infrastructure</h3>
                </div>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-canvas border border-border/50">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="text-sm font-medium text-ink truncate">Paving Schedule</span>
                            <Badge variant="outline" className="text-[10px] border-alert/20 bg-alert/5 text-alert whitespace-nowrap">Alert</Badge>
                        </div>
                        <p className="text-xs text-ink-muted line-clamp-2">Main Street resurfacing begins next Monday. Expect delays.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
