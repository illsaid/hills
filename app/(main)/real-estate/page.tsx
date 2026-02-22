'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { AddressProvider, useAddressContext } from '@/hooks/useAddressContext';
import { MarketIntelligence } from '@/components/MarketIntelligence';
import { AddressSelector, RadiusWindowControls, IntelCards, ModuleTile, ModuleDrawer } from '@/components/real-estate';

const MODULES = [
    { id: 'permits', title: 'Building Permits', icon: 'file-text', requiresVerification: true },
    { id: 'distress', title: 'Distress Signals', icon: 'alert-triangle', requiresVerification: false },
    { id: 'firescore', title: 'FireScore', icon: 'shield', requiresVerification: false },
];

function RealEstateContent() {
    const { address, lat, lon, radius_m, window_days, verificationStatus } = useAddressContext();
    const [summaries, setSummaries] = useState<Record<string, { newCount: number; headlineMetric: string; topTag?: string }>>({});
    const [loading, setLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeModule, setActiveModule] = useState<{ id: string; title: string; requiresVerification: boolean } | null>(null);

    useEffect(() => {
        if (!lat || !lon) {
            setSummaries({});
            return;
        }

        const fetchSummaries = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    lat: lat.toString(),
                    lon: lon.toString(),
                    radius_m: radius_m.toString(),
                    window_days: window_days.toString(),
                });

                const [permitsRes, firescoreRes] = await Promise.all([
                    fetch(`/api/real-estate/permits?${params}`),
                    fetch(`/api/real-estate/firescore?${params}`),
                ]);

                const newSummaries: Record<string, { newCount: number; headlineMetric: string; topTag?: string }> = {
                    distress: { newCount: 0, headlineMetric: 'Coming soon' },
                    firescore: { newCount: 0, headlineMetric: 'Coming soon' },
                };

                if (permitsRes.ok) {
                    const data = await permitsRes.json();
                    newSummaries.permits = data.summary;
                }

                if (firescoreRes.ok) {
                    const data = await firescoreRes.json();
                    newSummaries.firescore = data.summary;
                }

                setSummaries(newSummaries);
            } catch (error) {
                console.error('Failed to fetch summaries:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummaries();
    }, [lat, lon, radius_m, window_days]);

    const handleTileClick = (module: typeof MODULES[number]) => {
        if (!address) return;
        if (summaries[module.id]?.headlineMetric === 'Coming soon') return;
        setActiveModule(module);
        setDrawerOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-light text-stone-900 mb-2">
                    Real Estate Intelligence
                </h1>
                <p className="text-lg text-stone-500 max-w-2xl">
                    Address-driven market intel, permits, and property insights for Hollywood Hills.
                </p>
            </div>

            <MarketIntelligence />

            {address ? (
                <div className="space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <AddressSelector className="flex-1" />
                        <RadiusWindowControls />
                    </div>
                </div>
            ) : (
                <div className="relative p-8 md:p-10 bg-gradient-to-br from-stone-50 via-white to-slate-50 dark:from-white/5 dark:via-white/[0.02] dark:to-white/5 rounded-2xl border border-stone-200 dark:border-white/10">
                    <div className="max-w-xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 mb-5">
                            <Search className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            Look up your property
                        </h2>
                        <p className="text-stone-500 dark:text-stone-400 mb-6 text-sm leading-relaxed">
                            Type your street address below to get personalized intel on permits, construction activity, and risk signals nearby.
                        </p>
                        <AddressSelector variant="hero" autoFocus className="text-left" />
                    </div>
                </div>
            )}

            {address && <IntelCards />}

            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Intelligence Modules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MODULES.map(module => {
                        const summary = summaries[module.id] || { newCount: 0, headlineMetric: address ? 'Loading...' : 'Add an address to compute' };
                        const gated = module.requiresVerification && verificationStatus !== 'verified';
                        return (
                            <ModuleTile
                                key={module.id}
                                id={module.id}
                                title={module.title}
                                icon={module.icon}
                                headlineMetric={summary.headlineMetric}
                                newCount={summary.newCount}
                                topTag={summary.topTag}
                                loading={loading && module.id === 'permits'}
                                gated={gated}
                                onClick={() => handleTileClick(module)}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-stone-200">
                <Link
                    href="/"
                    className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>

            {activeModule && (
                <ModuleDrawer
                    moduleId={activeModule.id}
                    moduleTitle={activeModule.title}
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    requiresVerification={activeModule.requiresVerification}
                />
            )}
        </div>
    );
}

export default function RealEstatePage() {
    return (
        <AddressProvider>
            <RealEstateContent />
        </AddressProvider>
    );
}
