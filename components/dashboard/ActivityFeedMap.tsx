'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeedItem } from './types';

interface ActivityFeedMapProps {
    items: FeedItem[];
    onSelectItem?: (item: FeedItem) => void;
}

const TYPE_COLORS: Record<string, string> = {
    safety: '#ef4444',
    code: '#f59e0b',
    permit: '#3b82f6',
    event: '#10b981',
    gov: '#6b7280',
    street_work: '#f97316',
    real_estate: '#8b5cf6',
    news: '#6b7280',
};

export function ActivityFeedMap({ items, onSelectItem }: ActivityFeedMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const [mapReady, setMapReady] = useState(false);

    const geoItems = items.filter(i => i.geo?.lat && i.geo?.lng);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            if (!mapRef.current || mapInstanceRef.current) return;

            const map = L.map(mapRef.current, {
                preferCanvas: true,
                zoomControl: true,
            }).setView([34.115, -118.33], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 18,
            }).addTo(map);

            mapInstanceRef.current = map;
            layerRef.current = L.layerGroup().addTo(map);
            setMapReady(true);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                layerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !layerRef.current) return;

        import('leaflet').then((L) => {
            if (!layerRef.current) return;
            layerRef.current.clearLayers();

            for (const item of geoItems) {
                const lat = item.geo!.lat;
                const lng = item.geo!.lng;
                const color = TYPE_COLORS[item.type] || '#6b7280';
                const radius = item.severity === 3 ? 9 : item.severity === 2 ? 7 : 5;

                const circle = L.circleMarker([lat, lng], {
                    radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.85,
                });

                circle.bindTooltip(item.title, {
                    direction: 'top',
                    offset: [0, -radius],
                    className: 'text-xs',
                });

                circle.on('click', () => {
                    onSelectItem?.(item);
                });

                circle.addTo(layerRef.current);
            }

            if (geoItems.length > 0) {
                const bounds = L.latLngBounds(geoItems.map(i => [i.geo!.lat, i.geo!.lng]));
                mapInstanceRef.current?.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
            }
        });
    }, [geoItems, mapReady, onSelectItem]);

    if (geoItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                <p className="text-sm font-medium text-stone-500">No geo-located items</p>
                <p className="text-xs text-stone-400">Map shows items with GPS coordinates</p>
            </div>
        );
    }

    return (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
            <div ref={mapRef} className="w-full h-64" />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs shadow">
                {Object.entries(TYPE_COLORS).filter(([k]) => geoItems.some(i => i.type === k)).map(([type, color]) => (
                    <span key={type} className="flex items-center gap-1 capitalize text-stone-700 dark:text-stone-300">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                        {type.replace('_', ' ')}
                    </span>
                ))}
            </div>
        </div>
    );
}
