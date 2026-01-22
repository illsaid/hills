'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wind, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Location {
  name: string;
  aqi: number;
}

interface AtmosphericPulseProps {
  avgAQI: number;
  locations: Location[];
  spikeDetected: boolean;
  dominantPollutant: string;
  lastUpdated: string;
}

function getAQILevel(aqi: number) {
  if (aqi <= 50) return { label: 'Good', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-900' };
  if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-900' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-900' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900' };
  return { label: 'Hazardous', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-900' };
}

export function AtmosphericPulse({ avgAQI, locations, spikeDetected, dominantPollutant, lastUpdated }: AtmosphericPulseProps) {
  const aqiLevel = getAQILevel(avgAQI);
  const timeAgo = formatDistanceToNow(new Date(lastUpdated), { addSuffix: true });

  return (
    <Card className="p-5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:shadow-lg dark:hover:shadow-2xl transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-slate-500 dark:text-titanium-400" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-titanium-50">Air Quality</h3>
          </div>
          {spikeDetected && (
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          )}
        </div>

        <div className="text-center py-4">
          <div className="text-4xl font-light text-slate-900 dark:text-titanium-50 mb-1">
            {Math.round(avgAQI)}
          </div>
          <Badge
            variant="outline"
            className={`${aqiLevel.bg} ${aqiLevel.border} ${aqiLevel.color} border text-xs font-medium`}
          >
            {aqiLevel.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-titanium-400">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Dominant: <span className="text-slate-900 dark:text-titanium-200 font-medium">{dominantPollutant}</span></span>
          </div>

          {locations.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-titanium-500 mb-2">
                <MapPin className="w-3 h-3" />
                <span>Local Readings</span>
              </div>
              <div className="space-y-1.5">
                {locations.slice(0, 3).map((loc, i) => {
                  const locLevel = getAQILevel(loc.aqi);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-titanium-300 truncate flex-1">{loc.name}</span>
                      <span className={`font-medium ${locLevel.color} ml-2`}>{Math.round(loc.aqi)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="text-[10px] text-slate-400 dark:text-titanium-500 uppercase tracking-wider">
            Updated {timeAgo}
          </div>
        </div>
      </div>
    </Card>
  );
}
