export const dynamic = 'force-dynamic';

import { LegislativeSentinelDashboard } from '@/components/LegislativeSentinelDashboard';
import { NewsFeed } from '@/components/NewsFeed';
import { Landmark, Newspaper } from 'lucide-react';
import Link from 'next/link';

export default function CouncilPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-light text-slate-900 dark:text-titanium-50 mb-2">
                    Civic & Community
                </h1>
                <p className="text-base md:text-lg text-slate-500 dark:text-titanium-400 max-w-2xl">
                    City Hall updates, legislative tracking, and local news coverage.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Legislative - Priority */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Landmark className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-medium text-slate-900 dark:text-titanium-50">
                            Legislative Sentinel (CD4)
                        </h2>
                    </div>
                    <LegislativeSentinelDashboard />
                </div>

                {/* News Feed */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Newspaper className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-medium text-slate-900 dark:text-titanium-50">
                            Local Coverage
                        </h2>
                    </div>
                    {/* Reuse NewsFeed but perhaps we could make it expanded if needed */}
                    <NewsFeed />
                </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-slate-200 dark:border-white/5">
                <Link
                    href="/"
                    className="text-sm text-slate-500 dark:text-titanium-500 hover:text-slate-900 dark:hover:text-titanium-300 transition-colors"
                >
                    Back to Executive Briefing
                </Link>
            </div>
        </div>
    );
}
