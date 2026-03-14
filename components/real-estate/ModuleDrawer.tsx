'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader as Loader2, MapPin, ExternalLink, TriangleAlert as AlertTriangle, RefreshCw } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';
import { VerifiedGate } from './VerifiedGate';
import type { IntelEvent } from '@/lib/real-estate/types';

interface ModuleDrawerProps {
    moduleId: string;
    moduleTitle: string;
    isOpen: boolean;
    onClose: () => void;
    requiresVerification?: boolean;
}

export function ModuleDrawer({ moduleId, moduleTitle, isOpen, onClose, requiresVerification = false }: ModuleDrawerProps) {
    const { lat, lon, radius_m, window_days, verificationStatus } = useAddressContext();
    const [items, setItems] = useState<IntelEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'items'>('overview');
    const abortRef = useRef<AbortController | null>(null);

    const isGated = requiresVerification && verificationStatus !== 'verified';

    const fetchItems = async () => {
        if (!lat || !lon || isGated) return;

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                lat: lat.toString(),
                lon: lon.toString(),
                radius_m: radius_m.toString(),
                window_days: window_days.toString(),
            });

            const supportedModules = ['permits', 'buildwatch', 'distress', 'firescore'];
            if (supportedModules.includes(moduleId)) {
                const res = await fetch(`/api/real-estate/${moduleId}?${params}`, {
                    signal: abortRef.current.signal,
                });
                if (!res.ok) throw new Error(`Failed to load ${moduleTitle} data`);
                const data = await res.json();
                setItems(data.items || []);
            } else {
                setItems([]);
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !lat || !lon || isGated) return;
        fetchItems();
        return () => { abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, lat, lon, radius_m, window_days, moduleId, isGated]);

    if (!isOpen) return null;

    const severityColors = {
        high: 'border-l-red-500',
        med: 'border-l-amber-500',
        low: 'border-l-blue-500',
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {moduleTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {isGated ? (
                    <div className="flex-1 overflow-y-auto">
                        <VerifiedGate moduleName={moduleTitle} />
                    </div>
                ) : (
                    <>
                        <div className="flex border-b border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'overview'
                                    ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('items')}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'items'
                                    ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                Items ({items.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-3">
                                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                                    <p className="text-xs text-slate-400">Loading {moduleTitle.toLowerCase()}...</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
                                    <button
                                        onClick={fetchItems}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Retry
                                    </button>
                                </div>
                            ) : activeTab === 'overview' ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5">
                                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                                            {items.length}
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Total items in last {window_days} days within {radius_m}m
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {['high', 'med', 'low'].map(sev => {
                                            const count = items.filter(i => i.severity === sev).length;
                                            const colors = {
                                                high: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
                                                med: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
                                                low: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
                                            };
                                            return (
                                                <div key={sev} className={`p-3 rounded-xl text-center ${colors[sev as keyof typeof colors]}`}>
                                                    <div className="text-2xl font-bold">{count}</div>
                                                    <div className="text-xs capitalize">{sev === 'med' ? 'Medium' : sev}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-slate-500">
                                                {moduleId === 'permits' ? 'No permits found in this area' : 'No data available yet'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Try expanding the radius or time window
                                            </p>
                                        </div>
                                    ) : (
                                        items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-xl border-l-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 ${severityColors[item.severity]}`}
                                            >
                                                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-1">
                                                    {item.title}
                                                </p>
                                                {item.address_text && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 truncate">
                                                        {item.address_text}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>
                                                        {new Date(item.event_date).toLocaleDateString()}
                                                    </span>
                                                    {item.distance_m !== null && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {item.distance_m}m
                                                        </span>
                                                    )}
                                                    {item.source_url && (
                                                        <a
                                                            href={item.source_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            Source
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
