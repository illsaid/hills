'use client';

import { TriangleAlert as AlertTriangle, Flame, Shield } from 'lucide-react';
import type { AlertChip } from './types';

interface AlertStripProps {
    alerts: AlertChip[];
    totalCount?: number;
}

export function AlertStrip({ alerts, totalCount }: AlertStripProps) {
    const visibleAlerts = alerts.slice(0, 5);
    const hasAlerts = visibleAlerts.length > 0;
    const total = totalCount ?? alerts.length;

    if (!hasAlerts) {
        return (
            <div className="flex items-center justify-center h-10 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                <Shield className="w-4 h-4 mr-2" />
                All clear — no active alerts
            </div>
        );
    }

    const getIcon = (severity: AlertChip['severity']) => {
        switch (severity) {
            case 'critical': return <Flame className="w-4 h-4 shrink-0" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 shrink-0" />;
            default: return <Shield className="w-4 h-4 shrink-0" />;
        }
    };

    const getChipStyle = (severity: AlertChip['severity']) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20';
            default:
                return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20';
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Active Alerts
                </span>
                {total > visibleAlerts.length && (
                    <a href="/safety#alerts" className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        View all {total}
                    </a>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {visibleAlerts.map((alert) => (
                    <a
                        key={alert.id}
                        href="/safety#alerts"
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${getChipStyle(alert.severity)}`}
                    >
                        {getIcon(alert.severity)}
                        <span>{alert.title}</span>
                        <span className="text-xs opacity-60 ml-0.5">{alert.age}</span>
                        {alert.distance && (
                            <span className="text-xs opacity-60">&bull; {alert.distance}</span>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
}
