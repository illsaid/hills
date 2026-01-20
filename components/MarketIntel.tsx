'use client';

import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, DollarSign, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketData {
    quarter: string;
    generated_revenue: number;
    transaction_count: number;
    avg_tax: number;
    qoq_change_vol: number;
    top_sale_tier: string;
    context: string;
    updated_at: string;
}

export function MarketIntel() {
    const [data, setData] = useState<MarketData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/market-intel');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load market intel', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading || !data) return null;

    // Formatting currency
    const fmtMoney = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            notation: 'compact',
            compactDisplay: 'short'
        }).format(n);
    };

    // Detailed Format for Revenue
    const fmtRev = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 1,
            notation: 'compact'
        }).format(n);
    };

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="h-1 w-full bg-emerald-600" />
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 dark:text-titanium-100">
                            Market Intelligence
                        </h3>
                    </div>
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                        Measure ULA • {data.quarter}
                    </Badge>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ULA Revenue
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-titanium-100">
                            {fmtRev(data.generated_revenue)}
                        </div>
                        <div className="text-[10px] text-emerald-600/80 mt-1">Generated this quarter</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-xs text-slate-500">Transactions</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{data.transaction_count}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-xs text-slate-500">Avg Tax</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{fmtMoney(data.avg_tax)}</span>
                        </div>
                    </div>
                </div>

                {/* Context / Trend */}
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded p-3 text-sm text-slate-600 dark:text-slate-300 flex gap-3 items-start">
                    {data.qoq_change_vol >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-snug">{data.context}</span>
                </div>

                <div className="mt-3 text-[10px] text-slate-400 text-right">
                    Source: LA Controller (Measure ULA)
                </div>
            </CardContent>
        </Card>
    );
}
