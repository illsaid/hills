'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import type { FeedItem } from './types';

const HILLS_CENTER: [number, number] = [34.113, -118.345];
const HILLS_ZOOM = 12;

const HILLS_BOUNDARY: [number, number][] = [
  [34.152, -118.392],
  [34.152, -118.298],
  [34.077, -118.298],
  [34.077, -118.392],
];

interface StickyMapProps {
  items?: FeedItem[];
  selectedItemId?: string;
  onPinClick?: (item: FeedItem) => void;
}

export function StickyMap({ items = [], selectedItemId, onPinClick }: StickyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['permits', 'safety']));

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      }).setView(HILLS_CENTER, HILLS_ZOOM);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.polygon(HILLS_BOUNDARY, {
        color: '#1c1917',
        weight: 2,
        fillColor: '#1c1917',
        fillOpacity: 0.04,
        dashArray: '6 4',
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const geoItems = items.filter(
        (item) =>
          item.geo &&
          ((activeLayers.has('permits') && item.type === 'permit') ||
            (activeLayers.has('safety') && (item.type === 'safety' || item.type === 'code')))
      );

      geoItems.forEach((item) => {
        if (!item.geo) return;

        const color =
          item.severity >= 3
            ? '#ef4444'
            : item.severity === 2
            ? '#f59e0b'
            : item.type === 'permit'
            ? '#3b82f6'
            : '#6b7280';

        const isSelected = item.id === selectedItemId;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${isSelected ? '16px' : '12px'};
            height:${isSelected ? '16px' : '12px'};
            border-radius:50%;
            background:${color};
            border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.3);
            transition:all 0.15s;
          "></div>`,
          iconSize: [isSelected ? 16 : 12, isSelected ? 16 : 12],
          iconAnchor: [isSelected ? 8 : 6, isSelected ? 8 : 6],
        });

        const marker = L.marker([item.geo.lat, item.geo.lng], { icon })
          .addTo(map)
          .bindTooltip(item.title, { direction: 'top', offset: [0, -8] });

        marker.on('click', () => onPinClick?.(item));
        markersRef.current.push(marker);
      });
    });
  }, [items, activeLayers, selectedItemId, onPinClick]);

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setShowLayers((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow text-xs font-medium text-stone-700 hover:bg-white transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          Layers
        </button>
        {showLayers && (
          <div className="mt-1.5 bg-white rounded-xl shadow-lg border border-stone-200 p-2 space-y-1 min-w-[130px]">
            {[
              { id: 'permits', label: 'Permits', color: '#3b82f6' },
              { id: 'safety', label: 'Alerts', color: '#ef4444' },
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeLayers.has(layer.id)
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-400'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: activeLayers.has(layer.id) ? layer.color : '#d1d5db' }}
                />
                {layer.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs text-stone-500">
        Hollywood Hills
      </div>
    </div>
  );
}
