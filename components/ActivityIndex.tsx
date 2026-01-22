'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Minus, Loader2, Bell, Home, Package } from 'lucide-react';

interface ActivityCategory {
  name: string;
  count: number;
  vsWeek: number;
  vsAvg: number;
  icon: React.ElementType;
  color: string;
}

export function ActivityIndex() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ActivityCategory[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/activity-index');
        const json = await res.json();
        if (json.success && json.categories) {
          setData(json.categories);
        } else {
          setData(getDefaultData());
        }
      } catch (e) {
        setData(getDefaultData());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getDefaultData(): ActivityCategory[] {
    return [
      { name: 'Alarm Responses', count: 47, vsWeek: -12, vsAvg: 8, icon: Bell, color: 'amber' },
      { name: 'Burglary', count: 3, vsWeek: -25, vsAvg: -15, icon: Home, color: 'red' },
      { name: 'Theft', count: 11, vsWeek: 22, vsAvg: 5, icon: Package, color: 'orange' },
    ];
  }

  function getTrendIcon(value: number) {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  }

  function getTrendColor(value: number, inverse = false) {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    if (isNegative) return 'text-emerald-500';
    if (isPositive) return 'text-red-400';
    return 'text-slate-400 dark:text-titanium-400';
  }

  function getIconBgColor(color: string) {
    const colors: Record<string, string> = {
      amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
      red: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
      orange: 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20',
    };
    return colors[color] || colors.amber;
  }

  function getIconColor(color: string) {
    const colors: Record<string, string> = {
      amber: 'text-amber-600 dark:text-amber-400',
      red: 'text-red-600 dark:text-red-400',
      orange: 'text-orange-600 dark:text-orange-400',
    };
    return colors[color] || colors.amber;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 dark:backdrop-blur-md p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10">
          <ShieldAlert className="w-5 h-5 text-slate-600 dark:text-titanium-300" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900 dark:text-titanium-50">Activity Index</h3>
          <p className="text-xs text-slate-500 dark:text-titanium-400">7-day rolling window</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-titanium-500 px-1 pb-1">
            <span className="col-span-2">Category</span>
            <span className="text-center">Vs Week</span>
            <span className="text-center">Vs Avg</span>
          </div>

          {data.map((item) => {
            const Icon = item.icon;
            const WeekTrend = getTrendIcon(item.vsWeek);
            const AvgTrend = getTrendIcon(item.vsAvg);

            return (
              <div
                key={item.name}
                className="grid grid-cols-4 gap-2 items-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <div className="col-span-2 flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${getIconBgColor(item.color)}`}>
                    <Icon className={`w-4 h-4 ${getIconColor(item.color)}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-800 dark:text-titanium-100 block">{item.name}</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{item.count}</span>
                  </div>
                </div>

                <div className={`flex items-center justify-center gap-1 text-sm font-medium ${getTrendColor(item.vsWeek, true)}`}>
                  <WeekTrend className="w-3.5 h-3.5" />
                  <span>{Math.abs(item.vsWeek)}%</span>
                </div>

                <div className={`flex items-center justify-center gap-1 text-sm font-medium ${getTrendColor(item.vsAvg, true)}`}>
                  <AvgTrend className="w-3.5 h-3.5" />
                  <span>{Math.abs(item.vsAvg)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hidden dark:block absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
    </div>
  );
}
