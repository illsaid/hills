'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Navigation, Search, Loader2, X } from 'lucide-react';
import { useAddressContext } from '@/hooks/useAddressContext';

interface Prediction {
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
    lat?: number;
    lon?: number;
}

interface AddressSelectorProps {
    className?: string;
}

export function AddressSelector({ className = '' }: AddressSelectorProps) {
    const { address, addresses, setAddress, useDemoAddress, addAddress } = useAddressContext();
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchQuery.length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/geocode?action=autocomplete&input=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data.predictions) {
                    setPredictions(data.predictions);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error('Autocomplete error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [searchQuery]);

    const handleSelectPrediction = async (prediction: Prediction) => {
        setShowDropdown(false);
        setIsLoadingDetails(true);

        try {
            // Google Places (New) requires fetching details for lat/lon
            const res = await fetch(`/api/geocode?action=details&placeId=${prediction.placeId}`);
            const data = await res.json();

            if (data.lat && data.lon) {
                addAddress({
                    label: prediction.mainText,
                    address_text: data.address || prediction.description,
                    lat: data.lat,
                    lon: data.lon,
                });
                setSearchQuery('');
                setShowModal(false);
            } else if (prediction.lat && prediction.lon) {
                // Fallback for Nominatim-style responses
                addAddress({
                    label: prediction.mainText,
                    address_text: prediction.description,
                    lat: prediction.lat,
                    lon: prediction.lon,
                });
                setSearchQuery('');
                setShowModal(false);
            }
        } catch (error) {
            console.error('Geocode details error:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleSelectAddress = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id === '') {
            setAddress(null);
        } else {
            const addr = addresses.find(a => a.id === id);
            if (addr) setAddress(addr);
        }
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Address Dropdown - shows saved addresses */}
            <div className="relative flex-1 min-w-[200px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                    value={address?.id || ''}
                    onChange={handleSelectAddress}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                    <option value="">Select an address...</option>
                    {addresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                            {addr.label || addr.address_text}
                        </option>
                    ))}
                </select>
            </div>

            {/* Demo Address Button */}
            <button
                onClick={useDemoAddress}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
            >
                <Navigation className="w-4 h-4" />
                Try Demo
            </button>

            {/* Add Address Button */}
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add
            </button>

            {/* Add Address Modal with Google Places Search */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Add Address</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Address Search Input */}
                        <div ref={searchRef} className="relative">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for an address..."
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                />
                                {(isSearching || isLoadingDetails) && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                                )}
                            </div>

                            {/* Predictions Dropdown */}
                            {showDropdown && predictions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden z-10">
                                    {predictions.map((prediction, index) => (
                                        <button
                                            key={prediction.placeId || index}
                                            onClick={() => handleSelectPrediction(prediction)}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-start gap-3 border-b border-slate-100 dark:border-white/5 last:border-0"
                                        >
                                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {prediction.mainText}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {prediction.secondaryText}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 mt-3">
                            Start typing an LA-area address to search. Results powered by Google.
                        </p>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
