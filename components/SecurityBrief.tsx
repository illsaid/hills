'use client';

import { useEffect, useState } from 'react';
import { Shield, TrendingDown, TrendingUp, Minus, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SecurityStats {
    total: number;
    wow_change: number;
    yoy_change: number;
}

interface SecurityData {
    status: 'NORMAL' | 'ELEVATED';
    color: string;
    brief_text: string;
    updated_at: string;
    stats: SecurityStats;
}

export function SecurityBrief() {
    const [data, setData] = useState<SecurityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, this would fetch from your API or read the JSON file via an endpoint.
        // For now, we import the JSON directly if possible, or fetch from a static path.
        // Next.js allows importing JSON directly, but since it's updated at runtime by the script,
        // measuring it as a static asset might result in stale data until rebuild.
        // A better approach is fetching it from the public directory or an API route that reads the file.

        async function fetchBrief() {
            try {
                // Assuming the GitHub workflow writes to a location accessible via API/public
                // For this demo, we'll try to fetch from a local API route we'll create, 
                // OR we can read the file if we place it in `public/data`.
                // Let's assume we'll move the file to `public/data/security_brief.json` or create an API.

                // Temporary: fetch from API we will create
                const res = await fetch('/api/security-brief');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to load security brief', error);
            } finally {
                setLoading(false);
            }
        }

        fetchBrief();
    }, []);

    if (loading || !data) return null;

    const isElevated = data.status === 'ELEVATED';
    const StatusIcon = isElevated ? AlertTriangle : Shield;

    // Format the brief text paragraphs
    const paragraphs = data.brief_text.split('\n').filter(p => p.trim().length > 0);
    const statusLine = paragraphs[0]; // **Status:** ...
    const contextLines = paragraphs.slice(1);

    return (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className={`h-1 w-full ${isElevated ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <StatusIcon className={`w-5 h-5 ${isElevated ? 'text-amber-600' : 'text-emerald-600'}`} />
                        <h3 className="font-semibold text-slate-800 dark:text-titanium-100">
                            Security Brief
                        </h3>
                    </div>
                    <Badge variant="outline" className={`${isElevated ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {data.status}
                    </Badge>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Incidents</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{data.stats.total}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Vs Week</div>
                        <TrendIndicator value={data.stats.wow_change} />
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <div className="text-xs text-slate-500 mb-0.5">Vs Year</div>
                        <TrendIndicator value={data.stats.yoy_change} />
                    </div>
                </div>

                {/* Brief Text */}
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {contextLines.map((p, i) => (
                        <p key={i} className="leading-relaxed">
                            {p.replace(/\*\*(.*?)\*\*/g, (match, p1) => match /* Keep markdown parsing simple or use a renderer? For now, we manually bold if needed or just strip */)}
                            {/* Simple bold handling */}
                            {p.split('**').map((part, idx) =>
                                idx % 2 === 1 ? <span key={idx} className="font-medium text-slate-900 dark:text-white">{part}</span> : part
                            )}
                        </p>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {new Date(data.updated_at).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendIndicator({ value }: { value: number }) {
    if (value === 0) return <div className="font-semibold text-slate-500">-</div>;

    // For crime, UP is bad (red), DOWN is good (green)
    const isGood = value < 0;
    const color = isGood ? 'text-emerald-600' : 'text-rose-600';
    const Icon = value < 0 ? TrendingDown : TrendingUp;

    return (
        <div className={`flex items-center justify-center gap-1 font-bold ${color}`}>
            <Icon className="w-3 h-3" />
            {Math.abs(value)}%
        </div>
    );
}
