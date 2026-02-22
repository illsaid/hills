'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AddressProvider, useAddressContext } from '@/hooks/useAddressContext';
import { MarketIntelligence } from '@/components/MarketIntelligence';
import { AddressSelector, RadiusWindowControls, IntelCards, ModuleTile, ModuleDrawer, VerifiedGate } from '@/components/real-estate';

const MODULES = [
    { id: 'permits', title: 'Building Permits', icon: 'file-text', requiresVerification: true },
    { id: 'distress', title: 'Distress Signals', icon: 'alert-triangle', requiresVerification: false },
    { id: 'firescore', title: 'FireScore', icon: 'shield', requiresVerification: false },
];

function RealEstateContent() {
    const { address, lat, lon, radius_m, window_days, useDemoAddress, verificationStatus } = useAddressContext();
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
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <AddressSelector className="flex-1" />
                    <RadiusWindowControls />
                </div>
            ) : (
                <div className="p-8 bg-gradient-to-br from-stone-50 to-slate-50 dark:from-white/5 dark:to-white/[0.02] rounded-2xl border border-stone-200 dark:border-white/10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-white/10 mb-4">
                        <MapPin className="w-8 h-8 text-stone-500 dark:text-stone-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Add an address to get started
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Get personalized intel on permits, construction activity, and distress signals near any property.
                    </p>
                    <button
                        onClick={useDemoAddress}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-700 dark:hover:bg-stone-100 transition-colors"
                    >
                        <Navigation className="w-5 h-5" />
                        Try Demo Address
                    </button>
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
