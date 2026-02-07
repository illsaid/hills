'use client';

import { useState } from 'react';
import { Search, MapPin, AlertTriangle, FileText, Construction, Shield } from 'lucide-react';
import type { FeedItem } from './types';

interface StickyMapProps {
    items?: FeedItem[];
    selectedItemId?: string;
    onPinClick?: (item: FeedItem) => void;
}

const LAYER_OPTIONS = [
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'permits', label: 'Permits', icon: FileText },
    { id: 'street_work', label: 'Street Work', icon: Construction },
    { id: 'crime', label: 'Crime', icon: Shield },
];

export function StickyMap({ items = [], selectedItemId, onPinClick }: StickyMapProps) {
    const [activeLayers, setActiveLayers] = useState<string[]>(['alerts']);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleLayer = (layerId: string) => {
        setActiveLayers((prev) =>
            prev.includes(layerId) ? prev.filter((l) => l !== layerId) : [...prev, layerId]
        );
    };

    // Filter items that have geo and match active layers
    const visibleItems = items.filter((item) => {
        if (!item.geo) return false;
        if (activeLayers.includes('alerts') && (item.type === 'safety' || item.severity >= 2)) return true;
        if (activeLayers.includes('permits') && item.type === 'permit') return true;
        if (activeLayers.includes('street_work') && item.type === 'street_work') return true;
        if (activeLayers.includes('crime') && item.type === 'code') return true;
        return false;
    });

    const selectedItem = selectedItemId ? items.find((i) => i.id === selectedItemId) : null;
    const hasGeo = selectedItem?.geo != null;

    return (
        // Fills the parent container (which has explicit height)
        <div className="absolute inset-0">
            {/* Map background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Sample pins for items with geo */}
            {visibleItems.slice(0, 5).map((item, i) => (
                <div
                    key={item.id}
                    onClick={() => onPinClick?.(item)}
                    className={`absolute cursor-pointer transition-transform hover:scale-110 ${selectedItemId === item.id ? 'scale-125' : ''
                        }`}
                    style={{
                        top: `${25 + (i * 12)}%`,
                        left: `${20 + (i * 15)}%`
                    }}
                >
                    <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${item.severity >= 2 ? 'bg-red-500' : item.severity === 1 ? 'bg-amber-500' : 'bg-blue-500'
                        } ${item.severity >= 2 ? 'animate-pulse' : ''}`} />
                </div>
            ))}

            {/* No geo indicator */}
            {selectedItem && !hasGeo && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800/80 text-white text-xs rounded-lg flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Location unavailable
                </div>
            )}

            {/* Layer toggles - top */}
            <div className="absolute top-3 left-3 right-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {LAYER_OPTIONS.map((layer) => {
                    const Icon = layer.icon;
                    const isActive = activeLayers.includes(layer.id);
                    return (
                        <button
                            key={layer.id}
                            onClick={() => toggleLayer(layer.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${isActive
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {layer.label}
                        </button>
                    );
                })}
            </div>

            {/* Search bar - bottom */}
            <div className="absolute bottom-3 left-3 right-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>
    );
}
