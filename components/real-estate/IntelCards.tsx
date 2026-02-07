'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Loader2, MapPin } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';
import type { IntelEvent } from '@/lib/real-estate/types';

interface IntelCardsProps {
    className?: string;
    maxCards?: number;
}

export function IntelCards({ className = '', maxCards = 5 }: IntelCardsProps) {
    const { address, lat, lon, radius_m, window_days } = useAddressContext();
    const [items, setItems] = useState<IntelEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lat || !lon) {
            setItems([]);
            return;
        }

        const fetchItems = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    lat: lat.toString(),
                    lon: lon.toString(),
                    radius_m: radius_m.toString(),
                    window_days: window_days.toString(),
                });

                const res = await fetch(`/api/real-estate/permits?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setItems(data.items || []);
                }
            } catch (error) {
                console.error('Failed to fetch intel items:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [lat, lon, radius_m, window_days]);

    if (!address) {
        return null;
    }

    const displayItems = items.slice(0, maxCards);
    const severityColors = {
        high: 'border-l-red-500 bg-red-50/50 dark:bg-red-500/5',
        med: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5',
        low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/5',
    };

    const severityIcons = {
        high: <AlertTriangle className="w-4 h-4 text-red-500" />,
        med: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        low: <FileText className="w-4 h-4 text-blue-500" />,
    };

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Today's Intel
                </h3>
                {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {displayItems.length === 0 && !loading ? (
                <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 dark:bg-white/5 rounded-xl">
                    No recent activity in this area
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {displayItems.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border-l-4 border border-slate-200 dark:border-white/10 ${severityColors[item.severity]}`}
                        >
                            <div className="flex items-start gap-2 mb-2">
                                {severityIcons[item.severity]}
                                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                                    {item.source}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
                                {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                {item.distance_m !== null && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {item.distance_m < 1000
                                            ? `${item.distance_m}m`
                                            : `${(item.distance_m / 1000).toFixed(1)}km`}
                                    </span>
                                )}
                                <span>
                                    {new Date(item.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
