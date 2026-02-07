'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { QuickStat } from './types';

interface QuickStatsProps {
    stats: QuickStat[];
}

export function QuickStats({ stats }: QuickStatsProps) {
    const getTrendIcon = (trend?: QuickStat['trend']) => {
        switch (trend) {
            case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
            case 'down': return <TrendingDown className="w-3 h-3 text-emerald-500" />;
            default: return <Minus className="w-3 h-3 text-slate-400" />;
        }
    };

    return (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {stat.value}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {stat.label}
                        </div>
                        {stat.trend && stat.trendValue && (
                            <div className="flex items-center justify-center gap-1 mt-1 text-xs">
                                {getTrendIcon(stat.trend)}
                                <span className={stat.trend === 'up' ? 'text-red-500' : stat.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'}>
                                    {stat.trendValue}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
