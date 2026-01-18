'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Permit {
    permit_number: string;
    address: string;
    zip_code: string;
    apn: string;
    permit_type: string;
    description: string;
    issue_date: string;
    status: string;
    valuation: string | null;
    zimas_url: string;
}

interface PermitsResponse {
    success: boolean;
    count: number;
    permits: Permit[];
    error?: string;
}

export function PermitDashboard() {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPermits() {
            try {
                const res = await fetch('/api/permits');
                const data: PermitsResponse = await res.json();

                if (!data.success) {
                    throw new Error(data.error || 'Failed to fetch permits');
                }

                setPermits(data.permits);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPermits();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-titanium-500" />
                <span className="ml-2 text-slate-500 dark:text-titanium-400">Loading permits...</span>
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

    if (permits.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-titanium-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-titanium-400">No permits found for Hollywood Hills zip codes.</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatValuation = (val: string | null) => {
        if (!val) return null;
        const num = parseInt(val, 10);
        if (isNaN(num)) return null;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(num);
    };

    return (
        <div className="space-y-3">
            {permits.slice(0, 10).map((permit) => (
                <div
                    key={permit.permit_number}
                    className="group p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <h3 className="font-medium text-slate-900 dark:text-titanium-100 truncate">
                                    {permit.address}
                                </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                <Badge variant="outline" className="border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-titanium-300">
                                    {permit.permit_type}
                                </Badge>
                                <span className="text-slate-400 dark:text-titanium-500">•</span>
                                <span className="text-slate-500 dark:text-titanium-400">
                                    {formatDate(permit.issue_date)}
                                </span>
                                {permit.valuation && formatValuation(permit.valuation) && (
                                    <>
                                        <span className="text-slate-400 dark:text-titanium-500">•</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                            {formatValuation(permit.valuation)}
                                        </span>
                                    </>
                                )}
                            </div>

                            {permit.description && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-titanium-400 line-clamp-2">
                                    {permit.description}
                                </p>
                            )}

                            <p className="mt-1 text-[10px] text-slate-400 dark:text-titanium-600 font-mono">
                                APN: {permit.apn}
                            </p>
                        </div>

                        <a
                            href={permit.zimas_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500/30 text-slate-700 dark:text-titanium-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                            >
                                <span>View</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                        </a>
                    </div>
                </div>
            ))}

            {permits.length > 10 && (
                <p className="text-center text-xs text-slate-400 dark:text-titanium-500 pt-2">
                    Showing 10 of {permits.length} permits
                </p>
            )}
        </div>
    );
}
