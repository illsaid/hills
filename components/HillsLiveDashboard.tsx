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
    return { icon: Flame, color: 'text-alert', bg: 'bg-alert/10', type: 'fire' as const };
  }

  if (lowerSummary.includes('outage') || lowerSummary.includes('ladwp') || lowerSummary.includes('power')) {
    return { icon: Zap, color: 'text-ink-muted', bg: 'bg-ink-muted/10', type: 'power' as const };
  }

  if (lowerSummary.includes('sheriff') || lowerSummary.includes('crime') || lowerSummary.includes('security')) {
    return { icon: Shield, color: 'text-ink', bg: 'bg-ink/5', type: 'security' as const };
  }

  return { icon: AlertCircle, color: 'text-ink-muted', bg: 'bg-canvas', type: 'general' as const };
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
        const response = await fetch('/api/pulse');

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
        <Card className="p-8 text-center bg-panel border-border shadow-soft">
          <div className="animate-pulse">
            <div className="h-8 bg-canvas rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-canvas rounded w-64 mx-auto mb-2" />
            <div className="text-xs text-ink-muted">Loading Hills Live Intelligence...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !pulseData) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center bg-panel border-border shadow-soft">
          <div className="animate-pulse">
            <div className="h-8 bg-canvas rounded w-48 mx-auto mb-4" />
            <div className="h-4 bg-canvas rounded w-64 mx-auto mb-2" />
            <div className="text-xs text-ink-muted">Loading Hills Live Intelligence...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="h-px bg-border flex-1" />
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
            Hills Live
          </h2>
          <div className="h-px bg-border flex-1" />
        </div>
        <Card className="p-8 text-center bg-panel border-border shadow-soft">
          <AlertCircle className="w-12 h-12 text-alert mx-auto mb-4" />
          <p className="text-ink mb-2">{error}</p>
          <p className="text-xs text-ink-muted">
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-2">
        <div className="h-px bg-border flex-1" />
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
          Hills Live
        </h2>
        <div className="h-px bg-border flex-1" />
      </div>

      <div
        className={`
          relative overflow-hidden rounded-2xl transition-all duration-500 bg-panel shadow-soft
          ${isActive
            ? 'border-l-4 border-l-alert border-y border-r border-border ring-1 ring-alert/5'
            : 'border border-border'
          }
        `}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${iconData.bg}`}>
                <StatusIcon className={`w-6 h-6 ${iconData.color}`} />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-medium text-ink">
                  Neighborhood Status
                </h2>
                <p className="text-sm text-ink-muted">
                  Hills Live Intelligence
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`
                text-xs px-3 py-1 font-medium border
                ${isActive
                  ? 'bg-alert/10 text-alert border-alert/20'
                  : 'bg-safe/10 text-safe border-safe/20'
                }
              `}
            >
              {isActive ? '● ACTIVE' : '✓ CLEAR'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className={`
              p-6 rounded-xl border
              ${isActive
                ? 'bg-canvas border-alert/10'
                : 'bg-canvas border-border/50'
              }
            `}>
              <p className="text-lg leading-relaxed text-ink font-serif">
                {pulseData.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Updated {formatDistanceToNow(new Date(pulseData.last_updated), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {historicalAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px bg-border flex-1" />
            <h3 className="text-xs font-medium text-ink-muted uppercase tracking-widest">
              Recent Activity
            </h3>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="space-y-3">
            {historicalAlerts
              .filter(alert => alert.id !== pulseData?.last_updated) // Don't show current status in history
              .map((alert) => {
                const alertIconData = getIconForSummary(alert.summary);
                const AlertIcon = alertIconData.icon;
                const alertActive = alert.status.toLowerCase() === 'active';

                return (
                  <div
                    key={alert.id}
                    className="group p-4 bg-panel rounded-xl border border-border/50 hover:border-border hover:shadow-soft transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${alertIconData.bg} flex-shrink-0`}>
                        <AlertIcon className={`w-4 h-4 ${alertIconData.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {alertActive ? (
                            <Badge variant="outline" className="text-[10px] border-alert/20 text-alert bg-alert/5">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-safe/20 text-safe bg-safe/5">
                              Clear
                            </Badge>
                          )}
                          <span className="text-[10px] text-ink-muted">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm text-ink leading-relaxed">
                          {alert.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
