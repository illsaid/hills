'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Zap, Shield, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PulseData {
  last_updated: string;
  status: string;
  summary: string;
}

interface HistoricalAlert {
  id: string;
  timestamp: string;
  status: string;
  summary: string;
  type: 'fire' | 'power' | 'security' | 'general';
}

function getIconForSummary(summary: string) {
  const lowerSummary = summary.toLowerCase();

  if (lowerSummary.includes('fire') || lowerSummary.includes('medical') || lowerSummary.includes('lafd')) {
    return { icon: Flame, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', type: 'fire' as const };
  }

  if (lowerSummary.includes('outage') || lowerSummary.includes('ladwp') || lowerSummary.includes('power')) {
    return { icon: Zap, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', type: 'power' as const };
  }

  if (lowerSummary.includes('sheriff') || lowerSummary.includes('crime') || lowerSummary.includes('security')) {
    return { icon: Shield, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', type: 'security' as const };
  }

  return { icon: AlertCircle, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-950/30', type: 'general' as const };
}

export function HillsLiveDashboard() {
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [historicalAlerts, setHistoricalAlerts] = useState<HistoricalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://raw.githubusercontent.com/illsaid/hills/main/data/intelligence_pulse.json');

        if (!response.ok) {
          throw new Error('Failed to fetch pulse data');
        }

        const data: PulseData = await response.json();
        setPulseData(data);

        const iconData = getIconForSummary(data.summary);
        const newAlert: HistoricalAlert = {
          id: data.last_updated,
          timestamp: data.last_updated,
          status: data.status,
          summary: data.summary,
          type: iconData.type
        };

        setHistoricalAlerts(prev => {
          const exists = prev.some(alert => alert.id === newAlert.id);
          if (!exists) {
            return [newAlert, ...prev].slice(0, 10);
          }
          return prev;
        });

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center bg-white dark:bg-white/5 border-slate-200 dark:border-white/10">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-64 mx-auto mb-2" />
            <div className="text-xs text-slate-400 dark:text-titanium-500">Loading Hills Live Intelligence...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !pulseData) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center bg-white dark:bg-white/5 border-slate-200 dark:border-white/10">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-64 mx-auto mb-2" />
            <div className="text-xs text-slate-400 dark:text-titanium-500">Loading Hills Live Intelligence...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent flex-1" />
          <h2 className="text-sm font-medium text-slate-600 dark:text-titanium-400 uppercase tracking-wider">
            Hills Live
          </h2>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent flex-1" />
        </div>
        <Card className="p-8 text-center bg-white dark:bg-white/5 border-slate-200 dark:border-white/10">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-titanium-400 mb-2">{error}</p>
          <p className="text-xs text-slate-500 dark:text-titanium-500">
            Check browser console for details
          </p>
        </Card>
      </div>
    );
  }

  if (!pulseData) return null;

  const isActive = pulseData.status.toLowerCase() === 'active';
  const iconData = getIconForSummary(pulseData.summary);
  const StatusIcon = iconData.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-2">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent flex-1" />
        <h2 className="text-sm font-medium text-slate-600 dark:text-titanium-400 uppercase tracking-wider">
          Hills Live
        </h2>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent flex-1" />
      </div>

      <Card
        className={`
          overflow-hidden border-2 transition-all duration-500
          ${isActive
            ? 'bg-red-50 dark:bg-red-950/20 border-red-500 dark:border-red-500 shadow-lg shadow-red-500/20 animate-pulse'
            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'
          }
        `}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${iconData.bg}`}>
                <StatusIcon className={`w-6 h-6 ${iconData.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-light text-slate-900 dark:text-titanium-50">
                  Neighborhood Status
                </h2>
                <p className="text-sm text-slate-500 dark:text-titanium-500">
                  Hills Live Intelligence
                </p>
              </div>
            </div>

            <Badge
              variant={isActive ? 'destructive' : 'default'}
              className={`
                text-sm px-4 py-1.5 font-medium
                ${isActive
                  ? 'bg-red-600 text-white dark:bg-red-600 dark:text-white'
                  : 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400'
                }
              `}
            >
              {isActive ? '● ACTIVE' : '✓ CLEAR'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className={`
              p-4 rounded-lg border
              ${isActive
                ? 'bg-white/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
              }
            `}>
              <p className={`
                text-lg leading-relaxed
                ${isActive
                  ? 'text-red-900 dark:text-red-200 font-medium'
                  : 'text-slate-700 dark:text-titanium-300'
                }
              `}>
                {pulseData.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-titanium-500">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Updated {formatDistanceToNow(new Date(pulseData.last_updated), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {historicalAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
            <h3 className="text-sm font-medium text-slate-600 dark:text-titanium-400 uppercase tracking-wider">
              Recent Activity
            </h3>
            <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
          </div>

          <div className="space-y-3">
            {historicalAlerts.map((alert) => {
              const alertIconData = getIconForSummary(alert.summary);
              const AlertIcon = alertIconData.icon;
              const alertActive = alert.status.toLowerCase() === 'active';

              return (
                <Card
                  key={alert.id}
                  className="p-4 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${alertIconData.bg} flex-shrink-0`}>
                      <AlertIcon className={`w-4 h-4 ${alertIconData.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {alertActive ? (
                          <Badge variant="destructive" className="text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900">
                            Clear
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 dark:text-titanium-500">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-titanium-300 leading-relaxed">
                        {alert.summary}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
