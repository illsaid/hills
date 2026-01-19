'use client';

import { useEffect, useState } from 'react';
import { Flame, AlertTriangle, Siren } from 'lucide-react';

interface WeatherData {
    fireDangerLevel: 'none' | 'yellow' | 'red';
    fireDangerMessage: string;
}

interface SafetyDispatch {
    hasPriority1: boolean;
    priority1Incident: {
        title: string;
        description: string;
    } | null;
}

export function FireDangerBanner() {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [safetyData, setSafetyData] = useState<SafetyDispatch | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                // Check for simulation param in URL for testing
                const urlParams = new URLSearchParams(window.location.search);
                const sim = urlParams.get('sim');

                // Fetch weather data
                const weatherUrl = sim ? `/api/cron/weather?sim=${sim}` : '/api/cron/weather';
                const weatherRes = await fetch(weatherUrl);
                const weatherJson = await weatherRes.json();
                if (weatherJson.success && weatherJson.weather) {
                    setWeatherData(weatherJson.weather);
                }

                // Fetch safety dispatch data for Priority 1 incidents
                const safetyRes = await fetch('/api/safety-dispatch');
                const safetyJson = await safetyRes.json();
                if (safetyJson.success) {
                    setSafetyData({
                        hasPriority1: safetyJson.hasPriority1,
                        priority1Incident: safetyJson.priority1Incident,
                    });
                }
            } catch (e) {
                console.error("Banner fetch error", e);
            }
        }
        fetchData();

        // Auto-refresh every 2 minutes for real-time updates
        const interval = setInterval(fetchData, 120000);
        return () => clearInterval(interval);
    }, []);

    // Priority 1: Active brush fire takes highest priority
    const isFireIncident = safetyData?.priority1Incident?.title.match(/fire|smoke|brush|wildfire/i);

    if (safetyData?.hasPriority1 && safetyData.priority1Incident && isFireIncident) {
        return (
            <div className="w-full bg-red-600 dark:bg-red-700 border-b border-red-700 dark:border-red-800 px-4 py-3 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-white">
                    <Siren className="w-5 h-5 flex-shrink-0 animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-wide">Active Fire Incident</span>
                    <span className="text-sm hidden sm:inline">— {safetyData.priority1Incident.title}</span>
                </div>
            </div>
        );
    }

    // Priority 2: Red fire weather warning
    if (weatherData?.fireDangerLevel === 'red') {
        return (
            <div className="w-full bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800/50 px-4 py-2.5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-red-700 dark:text-red-400">
                    <Flame className="w-4 h-4 flex-shrink-0 animate-pulse" />
                    <span className="text-sm font-semibold">Fire Weather Warning</span>
                    <span className="text-sm hidden sm:inline">— {weatherData.fireDangerMessage}</span>
                </div>
            </div>
        );
    }

    // Priority 3: Yellow/elevated fire weather
    if (weatherData?.fireDangerLevel === 'yellow') {
        return (
            <div className="w-full bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">Elevated Fire Weather</span>
                    <span className="text-sm hidden sm:inline">— {weatherData.fireDangerMessage}</span>
                </div>
            </div>
        );
    }

    // No warnings
    return null;
}
