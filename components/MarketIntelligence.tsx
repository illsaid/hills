'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Home, Activity, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketData {
    quarter: string;
    generated_revenue: number;
    transaction_count: number;
    avg_tax: number;
    qoq_change_vol: number;
    yoy_change_vol: number | null;
    top_sale_tier: string;
    context: string;
    updated_at: string;
    breakdown: {
        tiers: Record<string, number>;
        property_types: Record<string, number>;
    };
}

export function MarketIntelligence() {
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
                console.error('Failed to fetch market intel', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return <div className="animate-pulse h-64 bg-slate-50 dark:bg-white/5 rounded-2xl" />;
    }

    if (!data) return null;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            notation: val > 1000000 ? 'compact' : 'standard'
        }).format(val);
    };

    const isPositive = data.qoq_change_vol >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const trendColor = isPositive ? 'text-emerald-600' : 'text-rose-600';

    return (
        <Card className="border-border bg-panel shadow-soft overflow-hidden">
            <div className="h-1 w-full bg-indigo-500" />
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                            <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-ink">Market Intelligence</h3>
                            <p className="text-xs text-ink-muted">Measure ULA Revenue • {data.quarter}</p>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="text-sm text-ink-muted mb-1 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" /> Revenue
                        </div>
                        <div className="text-2xl font-bold text-ink mb-1">{formatCurrency(data.generated_revenue)}</div>
                        <div className="text-xs text-ink-muted">Generated this quarter</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="text-sm text-ink-muted mb-1 flex items-center gap-1">
                            <Activity className="w-4 h-4" /> Volume
                        </div>
                        <div className="text-2xl font-bold text-ink mb-1">{data.transaction_count}</div>
                        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                            <TrendIcon className="w-3 h-3" />
                            {Math.abs(data.qoq_change_vol)}% QoQ
                        </div>
                    </div>
                </div>

                {/* Top Tier Info */}
                <div className="mb-6">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Dominant Price Tier</h4>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                        <span className="text-sm font-medium text-ink">{data.top_sale_tier}</span>
                        <Badge variant="secondary" className="bg-white dark:bg-white/10 shadow-sm">Top Segment</Badge>
                    </div>
                </div>

                {/* Context / Insights */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/20">
                    <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed">
                        {data.context}
                    </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-ink-muted">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Updated {new Date(data.updated_at).toLocaleDateString()}
                    </div>
                    <span>Data: LA City (jqan-regh)</span>
                </div>
            </CardContent>
        </Card>
    );
}
