'use client';

import { FileText, HardHat, AlertTriangle, Shield, Loader2, Lock } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface ModuleTileProps {
    id: string;
    title: string;
    icon?: string;
    headlineMetric: string;
    newCount: number;
    topTag?: string;
    loading?: boolean;
    onClick?: () => void;
}

const ICONS: Record<string, React.ElementType> = {
    permits: FileText,
    'file-text': FileText,
    buildwatch: HardHat,
    'hard-hat': HardHat,
    distress: AlertTriangle,
    'alert-triangle': AlertTriangle,
    insuretrack: Shield,
    shield: Shield,
};

export function ModuleTile({
    id,
    title,
    icon,
    headlineMetric,
    newCount,
    topTag,
    loading,
    onClick,
}: ModuleTileProps) {
    const { address } = useAddressContext();
    const Icon = ICONS[icon || id] || FileText;
    const hasData = address && newCount > 0;
    const isPlaceholder = headlineMetric === 'Coming soon';

    return (
        <button
            onClick={onClick}
            disabled={!address || isPlaceholder}
            className={`group relative p-5 rounded-2xl border text-left transition-all ${hasData
                    ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-md cursor-pointer'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] cursor-default'
                }`}
        >
            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${hasData
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20'
                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                    }`}>
                    <Icon className={`w-5 h-5 ${hasData ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                </div>
                <h3 className={`font-semibold ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {title}
                </h3>
                {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin ml-auto" />}
            </div>

            {/* Metric */}
            <div className={`text-2xl font-bold mb-1 ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {address ? (loading ? '—' : (newCount > 0 ? newCount : '0')) : '—'}
            </div>

            {/* Headline */}
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {address ? headlineMetric : 'Add an address to compute'}
            </p>

            {/* Top Tag */}
            {topTag && hasData && (
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    {topTag}
                </span>
            )}

            {/* Locked overlay for placeholders */}
            {isPlaceholder && (
                <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
            )}
        </button>
    );
}
