'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, ExternalLink } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'overview' | 'items'>('overview');

    const isGated = requiresVerification && verificationStatus !== 'verified';

    useEffect(() => {
        if (!isOpen || !lat || !lon || isGated) return;

        const fetchItems = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    lat: lat.toString(),
                    lon: lon.toString(),
                    radius_m: radius_m.toString(),
                    window_days: window_days.toString(),
                });

                if (moduleId === 'permits' || moduleId === 'buildwatch') {
                    const res = await fetch(`/api/real-estate/${moduleId}?${params}`);
                    if (res.ok) {
                        const data = await res.json();
                        setItems(data.items || []);
                    }
                } else {
                    setItems([]);
                }
            } catch (error) {
                console.error('Failed to fetch module items:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
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
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
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
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
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
                                        <p className="text-sm text-slate-500 text-center py-8">
                                            {moduleId === 'permits' ? 'No permits found in this area' : 'Coming soon'}
                                        </p>
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
