'use client';

import { FileText, HardHat, AlertTriangle, Shield, Loader2, Lock, MapPin } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface ModuleTileProps {
    id: string;
    title: string;
    icon?: string;
    headlineMetric: string;
    newCount: number;
    topTag?: string;
    loading?: boolean;
    gated?: boolean;
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
    gated,
    onClick,
}: ModuleTileProps) {
    const { address } = useAddressContext();
    const Icon = ICONS[icon || id] || FileText;
    const hasData = address && newCount > 0 && !gated;
    const isPlaceholder = headlineMetric === 'Coming soon';
    const isDisabled = !address || isPlaceholder || gated;

    return (
        <button
            onClick={gated ? undefined : onClick}
            disabled={isDisabled}
            className={`group relative p-5 rounded-2xl border text-left transition-all ${
                gated
                    ? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] cursor-default'
                    : hasData
                        ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md cursor-pointer'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] cursor-default'
            }`}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${
                    gated
                        ? 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                        : hasData
                            ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20'
                            : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                }`}>
                    <Icon className={`w-5 h-5 ${
                        gated ? 'text-slate-300 dark:text-slate-600' : hasData ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`} />
                </div>
                <h3 className={`font-semibold ${
                    gated ? 'text-slate-400 dark:text-slate-500' : hasData ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}>
                    {title}
                </h3>
                {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin ml-auto" />}
            </div>

            <div className={`text-2xl font-bold mb-1 ${
                gated ? 'text-slate-300 dark:text-slate-600' : hasData ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
            }`}>
                {gated ? '—' : address ? (loading ? '—' : (newCount > 0 ? newCount : '0')) : '—'}
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {gated ? 'Hills address required' : address ? headlineMetric : 'Add an address to compute'}
            </p>

            {topTag && hasData && (
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    {topTag}
                </span>
            )}

            {gated && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                </div>
            )}

            {isPlaceholder && !gated && (
                <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
            )}
        </button>
    );
}
