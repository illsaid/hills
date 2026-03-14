'use client';

import { useEffect, useState } from 'react';
import { Chrome as Home, Ruler, Calendar, DollarSign, Tag, Layers, Loader as Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface Parcel {
    apn: string;
    ain: string;
    address: string;
    city: string;
    zip_code: string;
    year_built: number | null;
    sqft: number | null;
    units: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    assessed_value: number | null;
    zoning: string | null;
    use_code: string | null;
    use_type: string | null;
    updated_at: string;
}

export function ParcelProfile() {
    const { address, lat, lon } = useAddressContext();
    const [parcel, setParcel] = useState<Parcel | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!address) {
            setParcel(null);
            setNotFound(false);
            return;
        }

        const fetchParcel = async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const addressStr = typeof address === 'string' ? address : (address as any)?.label || (address as any)?.address || String(address);
                const params = new URLSearchParams({ address: addressStr });
                const res = await fetch(`/api/real-estate/parcel?${params}`);
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                if (data.parcels && data.parcels.length > 0) {
                    setParcel(data.parcels[0]);
                } else {
                    setParcel(null);
                    setNotFound(true);
                }
            } catch {
                setParcel(null);
            } finally {
                setLoading(false);
            }
        };

        fetchParcel();
    }, [address]);

    if (!address) return null;

    if (loading) {
        return (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Looking up parcel data...
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No parcel record found for this address.</p>
                </div>
            </div>
        );
    }

    if (!parcel) return null;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                        <Home className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Parcel Profile</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {parcel.address}{parcel.city ? `, ${parcel.city}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {parcel.assessed_value && (
                        <span className="text-sm font-semibold text-slate-900 dark:text-white hidden sm:block">
                            ${(parcel.assessed_value / 1000).toFixed(0)}K assessed
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 dark:border-white/10 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {parcel.assessed_value !== null && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <DollarSign className="w-3 h-3" />
                                    Assessed Value
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    ${parcel.assessed_value.toLocaleString()}
                                </p>
                            </div>
                        )}
                        {parcel.year_built !== null && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    Year Built
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{parcel.year_built}</p>
                            </div>
                        )}
                        {parcel.sqft !== null && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Ruler className="w-3 h-3" />
                                    Square Feet
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{parcel.sqft.toLocaleString()}</p>
                            </div>
                        )}
                        {(parcel.bedrooms !== null || parcel.bathrooms !== null) && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Layers className="w-3 h-3" />
                                    Beds / Baths
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {parcel.bedrooms ?? '—'} bd / {parcel.bathrooms ?? '—'} ba
                                </p>
                            </div>
                        )}
                        {parcel.zoning && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Tag className="w-3 h-3" />
                                    Zoning
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{parcel.zoning}</p>
                            </div>
                        )}
                        {parcel.use_type && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Home className="w-3 h-3" />
                                    Use Type
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{parcel.use_type}</p>
                            </div>
                        )}
                        {parcel.units !== null && parcel.units > 1 && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    <Layers className="w-3 h-3" />
                                    Units
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{parcel.units}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-white/10">
                        <span>APN: {parcel.apn || parcel.ain}</span>
                        {parcel.updated_at && (
                            <span>Updated {new Date(parcel.updated_at).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
