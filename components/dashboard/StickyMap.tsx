'use client';

import { useEffect, useRef, useState } from 'react';
import { Layers, MapPin } from 'lucide-react';
import type { FeedItem } from './types';

const HILLS_CENTER: [number, number] = [34.113, -118.345];
const HILLS_ZOOM = 12;

const HILLS_BOUNDARY: [number, number][] = [
  [34.152, -118.392],
  [34.152, -118.298],
  [34.077, -118.298],
  [34.077, -118.392],
];

const LAYER_CONFIG = [
  { id: 'safety',  label: 'Safety',     color: '#ef4444', types: ['safety'] },
  { id: 'permits', label: 'Permits',    color: '#3b82f6', types: ['permit'] },
  { id: 'code',    label: 'Violations', color: '#f59e0b', types: ['code'] },
  { id: 'work',    label: 'Street Work',color: '#8b5cf6', types: ['street_work'] },
] as const;

function pinColor(item: FeedItem): string {
  if (item.type === 'safety') return item.severity >= 3 ? '#dc2626' : '#ef4444';
  if (item.type === 'code')   return '#f59e0b';
  if (item.type === 'permit') return '#3b82f6';
  if (item.type === 'street_work') return '#8b5cf6';
  return '#6b7280';
}

function activeLayersDefault(): Set<string> {
  return new Set(['safety', 'permits', 'code', 'work']);
}

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
  const [activeLayers, setActiveLayers] = useState<Set<string>>(activeLayersDefault);
  const [pinCount, setPinCount] = useState(0);

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

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
        dragging: true,
      }).setView(HILLS_CENTER, HILLS_ZOOM);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.polygon(HILLS_BOUNDARY, {
        color: '#0ea5e9',
        weight: 1.5,
        fillColor: '#0ea5e9',
        fillOpacity: 0.04,
        dashArray: '5 4',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

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

      const activeTypes = LAYER_CONFIG
        .filter(l => activeLayers.has(l.id))
        .flatMap(l => l.types as unknown as string[]);

      const geoItems = items.filter(
        (item) => item.geo && activeTypes.includes(item.type)
      );

      setPinCount(geoItems.length);

      geoItems.forEach((item) => {
        if (!item.geo) return;

        const color = pinColor(item);
        const isSelected = item.id === selectedItemId;
        const size = isSelected ? 18 : 12;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:${color};
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,${isSelected ? '0.45' : '0.25'});
            transition:all 0.15s;
            ${isSelected ? 'outline:2px solid ' + color + ';outline-offset:2px;' : ''}
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const age = (() => {
          const d = new Date(item.timestamp);
          const diffMs = Date.now() - d.getTime();
          const hrs = Math.floor(diffMs / 3600000);
          if (hrs < 1) return 'Just now';
          if (hrs < 24) return `${hrs}h ago`;
          const days = Math.floor(hrs / 24);
          return `${days}d ago`;
        })();

        const popup = L.popup({ maxWidth: 220, closeButton: false, offset: [0, -size / 2] }).setContent(`
          <div style="font-family:system-ui,sans-serif;padding:2px 0;">
            <div style="font-size:11px;font-weight:600;color:#0f172a;line-height:1.3;margin-bottom:4px;">${item.title}</div>
            ${item.summary ? `<div style="font-size:10px;color:#64748b;line-height:1.4;margin-bottom:4px;">${item.summary.slice(0, 100)}${item.summary.length > 100 ? '…' : ''}</div>` : ''}
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:9px;font-weight:600;color:white;background:${color};padding:1px 6px;border-radius:9999px;">${item.type.replace('_', ' ')}</span>
              <span style="font-size:9px;color:#94a3b8;">${age}</span>
            </div>
          </div>
        `);

        const marker = L.marker([item.geo.lat, item.geo.lng], { icon })
          .addTo(map)
          .bindPopup(popup);

        marker.on('click', () => {
          marker.openPopup();
          onPinClick?.(item);
        });

        if (isSelected) {
          marker.openPopup();
        }

        markersRef.current.push(marker);
      });
    });
  }, [items, activeLayers, selectedItemId, onPinClick]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const geoTotal = items.filter(i => i.geo).length;

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Layer toggle */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setShowLayers((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm text-xs font-medium text-slate-700 hover:bg-white transition-colors border border-slate-200/60"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Layers
        </button>
        {showLayers && (
          <div className="mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 p-2 space-y-0.5 min-w-[140px]">
            {LAYER_CONFIG.map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeLayers.has(layer.id)
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
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

      {/* Pin count badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200/60">
        <MapPin className="w-3 h-3 text-slate-400" />
        <span className="text-xs font-semibold text-slate-700 tabular-nums">{pinCount}</span>
        <span className="text-xs text-slate-400">pinned</span>
      </div>

      {/* Neighborhood label */}
      <div className="absolute bottom-8 left-3 z-10 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs text-slate-500 border border-slate-200/40">
        Hollywood Hills
      </div>

      {/* Empty state overlay */}
      {geoTotal === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px]">
          <MapPin className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">No mapped items</p>
          <p className="text-xs text-slate-400 mt-0.5">Location data unavailable</p>
        </div>
      )}
    </div>
  );
}
