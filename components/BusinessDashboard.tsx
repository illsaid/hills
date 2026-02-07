'use client';

import { useEffect, useState } from 'react';
import { Loader2, Briefcase, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabaseBrowser } from '@/lib/supabase/browser';

interface BusinessItem {
    id: string;
    title: string;
    description: string;
    category: string;
    filing_date: string;
    is_renewal: boolean;
}

interface FeedResponse {
    success: boolean;
    count: number;
    items: BusinessItem[];
    error?: string;
}

export function BusinessDashboard() {
    const [items, setItems] = useState<BusinessItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFeed() {
            try {
                const res = await fetch('/api/businesses?limit=100');
                const data: FeedResponse = await res.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch businesses');
                }

                setItems(data.items);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchFeed();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-500">Loading new businesses...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-12 text-red-500">
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="group p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-300"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-1.5 h-1.5 rounded-full bg-blue-500`} />
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {item.category}
                                </span>
                                {item.is_renewal && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-5 border-green-200 text-green-700 bg-green-50">
                                        Renewal
                                    </Badge>
                                )}
                            </div>

                            <h3 className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100 leading-snug mb-2">
                                {item.title}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{item.description.split('•')[1] || item.description}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                                <Calendar className="w-3 h-3" />
                                <span>Filed: {new Date(item.filing_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
