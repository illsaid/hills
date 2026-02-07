export const dynamic = 'force-dynamic';

import { NeighborhoodFrictionDashboard } from '@/components/RoadWorkDashboard';
import { MaintenanceSignals } from '@/components/MaintenanceSignals';
import { Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function InfrastructurePage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-light text-stone-900 mb-2">
                    Street Work & Infrastructure
                </h1>
                <p className="text-lg text-stone-500 max-w-2xl">
                    Road closures, construction, and public works affecting Hollywood Hills.
                </p>
            </div>

            {/* Road Work & Maintenance */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-medium text-stone-900">
                        Active Road Work
                    </h2>
                </div>
                <NeighborhoodFrictionDashboard />
                <MaintenanceSignals />
            </div>

            <div className="flex justify-end pt-8 border-t border-stone-200">
                <Link
                    href="/"
                    className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

