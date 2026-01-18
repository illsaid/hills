'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, TrafficCone, Loader2, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FrictionItem {
    id: string;
    project_name: string;
    street_name: string;
    work_type: string;
    work_description: string;
    status: string;
    date: string;
    source: string;
    is_traffic_delay: boolean;
}

interface FrictionResponse {
    success: boolean;
    count: number;
    friction: FrictionItem[];
    error?: string;
}

export function NeighborhoodFrictionDashboard() {
    const [items, setItems] = useState<FrictionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFriction() {
            try {
                const res = await fetch('/api/roadwork');
                const data: FrictionResponse = await res.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch friction data');
                }

                setItems(data.friction);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchFriction();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-titanium-500" />
                <span className="ml-2 text-slate-500 dark:text-titanium-400">Loading street work...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12 text-red-500">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">
                <CheckCircle className="w-10 h-10 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-titanium-400">No active street work in Hollywood Hills area.</p>
                <p className="text-xs text-slate-400 dark:text-titanium-600 mt-1">All roads clear</p>
            </div>
        );
    }

    const getWorkTypeColor = (workType: string) => {
        const type = workType.toUpperCase();
        if (type.includes('RESURF')) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700/50';
        if (type.includes('SLURRY')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50';
        return 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-titanium-300 border-slate-200 dark:border-white/10';
    };

    return (
        <div className="space-y-3">
            {items.slice(0, 8).map((item) => (
                <div
                    key={item.id}
                    className="group p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <TrafficCone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <h3 className="font-medium text-slate-900 dark:text-titanium-100 truncate">
                                    {item.street_name}
                                </h3>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-titanium-300 line-clamp-2 mt-1">
                                {item.project_name}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                <Badge variant="outline" className={getWorkTypeColor(item.work_type)}>
                                    {item.work_type}
                                </Badge>
                                <span className="text-slate-400 dark:text-titanium-500">•</span>
                                <span className="text-slate-500 dark:text-titanium-400 font-medium">
                                    {item.date}
                                </span>
                                <span className="text-slate-400 dark:text-titanium-500">•</span>
                                <span className="text-slate-400 dark:text-titanium-500 text-[10px]">
                                    {item.source}
                                </span>
                                {item.is_traffic_delay && (
                                    <>
                                        <span className="text-slate-400 dark:text-titanium-500">•</span>
                                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700/50">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Traffic Delay
                                        </Badge>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {items.length > 8 && (
                <p className="text-center text-xs text-slate-400 dark:text-titanium-500 pt-2">
                    Showing 8 of {items.length} active projects
                </p>
            )}
        </div>
    );
}
