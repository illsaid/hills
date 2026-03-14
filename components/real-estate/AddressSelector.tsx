'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader as Loader2, X, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, ChevronDown } from 'lucide-react';
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
    autoFocus?: boolean;
    variant?: 'compact' | 'hero';
}

export function AddressSelector({ className = '', autoFocus = false, variant = 'compact' }: AddressSelectorProps) {
    const { address, addresses, setAddress, addAddress, verificationStatus } = useAddressContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setShowSaved(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchQuery.length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            setSearchError(null);
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        debounceRef.current = setTimeout(async () => {
            abortRef.current?.abort();
            abortRef.current = new AbortController();
            try {
                const res = await fetch(
                    `/api/geocode?action=autocomplete&input=${encodeURIComponent(searchQuery)}`,
                    { signal: abortRef.current.signal }
                );
                if (!res.ok) throw new Error('Address search failed');
                const data = await res.json();
                if (data.predictions) {
                    setPredictions(data.predictions);
                    setShowDropdown(true);
                    setShowSaved(false);
                } else {
                    setPredictions([]);
                }
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                setSearchError('Could not search addresses. Please try again.');
                setPredictions([]);
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => { abortRef.current?.abort(); };
    }, [searchQuery]);

    const handleSelectPrediction = (prediction: Prediction) => {
        setShowDropdown(false);
        setSearchQuery('');
        setSearchError(null);

        if (prediction.lat && prediction.lon) {
            addAddress({
                label: prediction.mainText,
                address_text: prediction.description,
                lat: prediction.lat,
                lon: prediction.lon,
            });
        } else {
            setSearchError('Could not get coordinates for this address. Try a more specific address.');
        }
    };

    const handleSelectSaved = (addr: typeof addresses[number]) => {
        setAddress(addr);
        setShowSaved(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        setSearchQuery('');
        setPredictions([]);
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    const isHero = variant === 'hero';

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className={`relative flex items-center gap-2 ${
                isHero
                    ? 'bg-white dark:bg-white/5 rounded-2xl border-2 border-stone-200 dark:border-white/10 shadow-sm focus-within:border-teal-500 dark:focus-within:border-teal-400 focus-within:shadow-md transition-all'
                    : 'bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-teal-500 dark:focus-within:border-teal-400 transition-colors'
            }`}>
                <Search className={`absolute left-4 text-stone-400 pointer-events-none ${isHero ? 'w-5 h-5' : 'w-4 h-4'}`} />

                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (searchQuery.length >= 3 && predictions.length > 0) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder={address ? 'Search a different address...' : 'Enter a street address in the Hollywood Hills...'}
                    className={`w-full bg-transparent text-slate-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none ${
                        isHero
                            ? 'pl-12 pr-12 py-4 text-base'
                            : 'pl-10 pr-10 py-2.5 text-sm'
                    }`}
                    autoFocus={autoFocus}
                />

                {isSearching && (
                    <Loader2 className={`absolute right-4 text-stone-400 animate-spin ${isHero ? 'w-5 h-5' : 'w-4 h-4'}`} />
                )}
                {!isSearching && searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                    >
                        <X className={isHero ? 'w-5 h-5' : 'w-4 h-4'} />
                    </button>
                )}
            </div>

            {searchError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {searchError}
                </p>
            )}

            {isHero && !searchError && (
                <p className="text-xs text-stone-400 mt-2 ml-1">
                    Start typing to search — results appear as you type
                </p>
            )}

            {address && !isHero && (
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span className="font-medium truncate max-w-[200px]">
                            {address.label || address.address_text}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    </button>

                    {verificationStatus === 'verified' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Hills verified
                        </div>
                    )}
                    {verificationStatus === 'unverified' && (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-400 cursor-help"
                            title="This address is outside the Hollywood Hills service area. Some features may show limited results."
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Outside Hills
                        </div>
                    )}

                    <button
                        onClick={() => { setAddress(null); }}
                        className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 ml-auto"
                    >
                        Clear
                    </button>
                </div>
            )}

            {showDropdown && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-white/10 shadow-xl overflow-hidden z-50">
                    {predictions.map((prediction, index) => (
                        <button
                            key={prediction.placeId || index}
                            onClick={() => handleSelectPrediction(prediction)}
                            className="w-full px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-white/5 flex items-start gap-3 border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors"
                        >
                            <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {prediction.mainText}
                                </div>
                                <div className="text-xs text-stone-500 truncate">
                                    {prediction.secondaryText}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showSaved && addresses.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-white/10 shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-2 text-xs font-medium text-stone-400 uppercase tracking-wide border-b border-stone-100 dark:border-white/5">
                        Saved Addresses
                    </div>
                    {addresses.map((addr) => (
                        <button
                            key={addr.id}
                            onClick={() => handleSelectSaved(addr)}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-stone-100 dark:border-white/5 last:border-0 transition-colors ${
                                address?.id === addr.id
                                    ? 'bg-teal-50 dark:bg-teal-500/10'
                                    : 'hover:bg-stone-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <MapPin className={`w-4 h-4 flex-shrink-0 ${
                                address?.id === addr.id ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400'
                            }`} />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {addr.label || addr.address_text}
                                </div>
                                {addr.label && (
                                    <div className="text-xs text-stone-500 truncate">{addr.address_text}</div>
                                )}
                            </div>
                            {address?.id === addr.id && (
                                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-auto flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
