'use client';

import { Ruler, Calendar } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface ControlOption {
    value: number;
    label: string;
}

interface RadiusWindowControlsProps {
    className?: string;
    radiusOptions?: ControlOption[];
    windowOptions?: ControlOption[];
}

// Default options (used by permits and other modules)
const DEFAULT_RADIUS_OPTIONS: ControlOption[] = [
    { value: 250, label: '250m' },
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
];

const DEFAULT_WINDOW_OPTIONS: ControlOption[] = [
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '365 days' },
];

// BuildWatch-specific options (export for use in BuildWatch UI)
export const BUILDWATCH_RADIUS_OPTIONS: ControlOption[] = [
    { value: 1000, label: '1km' },
    { value: 2000, label: '2km' },
    { value: 5000, label: '5km' },
];

export const BUILDWATCH_WINDOW_OPTIONS: ControlOption[] = [
    { value: 90, label: '90d' },
    { value: 180, label: '180d' },
    { value: 365, label: '365d' },
];

export function RadiusWindowControls({
    className = '',
    radiusOptions = DEFAULT_RADIUS_OPTIONS,
    windowOptions = DEFAULT_WINDOW_OPTIONS,
}: RadiusWindowControlsProps) {
    const { radius_m, window_days, setRadius, setWindowDays, address } = useAddressContext();

    // Disabled when no address selected
    const disabled = !address;

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            {/* Radius */}
            <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-400" />
                <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                    {radiusOptions.map(opt => (
                        <button
                            key={opt.value}
                            disabled={disabled}
                            onClick={() => setRadius(opt.value)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${radius_m === opt.value
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Window */}
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                    {windowOptions.map(opt => (
                        <button
                            key={opt.value}
                            disabled={disabled}
                            onClick={() => setWindowDays(opt.value)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${window_days === opt.value
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
