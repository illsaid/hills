'use client';

import { AlertTriangle, Flame, Shield } from 'lucide-react';
import type { AlertChip } from './types';

interface AlertStripProps {
    alerts: AlertChip[];
    totalCount?: number; // Total alerts available
}

export function AlertStrip({ alerts, totalCount }: AlertStripProps) {
    const visibleAlerts = alerts.slice(0, 3);
    const hasAlerts = visibleAlerts.length > 0;
    const total = totalCount ?? alerts.length;

    if (!hasAlerts) {
        return (
            <div className="hidden md:flex items-center justify-center h-8 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                <Shield className="w-4 h-4 mr-2" />
                All clear — no active alerts
            </div>
        );
    }

    const getIcon = (severity: AlertChip['severity']) => {
        switch (severity) {
            case 'critical': return <Flame className="w-4 h-4" />;
            case 'warning': return <AlertTriangle className="w-4 h-4" />;
            default: return <Shield className="w-4 h-4" />;
        }
    };

    const getChipStyle = (severity: AlertChip['severity']) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400';
            case 'warning':
                return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400';
            default:
                return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400';
        }
    };

    return (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
            {/* Title */}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Top Alerts
            </span>

            {/* Alert chips */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {visibleAlerts.map((alert) => (
                    <a
                        key={alert.id}
                        href={alert.href || '/safety'}
                        target={alert.href?.startsWith('http') ? '_blank' : undefined}
                        rel={alert.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap cursor-pointer hover:shadow-sm transition-shadow ${getChipStyle(alert.severity)}`}
                    >
                        {getIcon(alert.severity)}
                        <span className="max-w-[140px] truncate">{alert.title}</span>
                        <span className="text-xs opacity-70">{alert.age}</span>
                        {alert.distance && (
                            <span className="text-xs opacity-70">&bull; {alert.distance}</span>
                        )}
                    </a>
                ))}
            </div>

            {/* Count */}
            {total > visibleAlerts.length && (
                <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {visibleAlerts.length} of {total}
                </span>
            )}
        </div>
    );
}
