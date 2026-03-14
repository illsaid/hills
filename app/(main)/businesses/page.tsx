'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Search, Map as MapIcon, List, ChartBar as BarChart3, X, Building2 } from 'lucide-react';

interface Business {
  location_account: string;
  business_name: string;
  dba_name: string;
  street_address: string;
  city: string;
  zip_code: string;
  location_description: string;
  primary_naics_description: string;
  naics: string;
  council_district: string;
  location_start_date: string;
  location?: {
    latitude: string;
    longitude: string;
  } | null;
}

const ZIP_CODES = ['90046', '90068', '90069'];
const API_URL = 'https://data.lacity.org/resource/r4uk-afju.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

let businessCache: { data: Business[]; fetchedAt: number } | null = null;

async function fetchBusinesses(limit: number = 5000): Promise<Business[]> {
  if (businessCache && Date.now() - businessCache.fetchedAt < CACHE_TTL_MS) {
    return businessCache.data;
  }

  const zipQuery = ZIP_CODES.map(zip => `starts_with(zip_code, '${zip}')`).join(' OR ');
  const query = `?$where=(${zipQuery}) AND location IS NOT NULL&$limit=${limit}&$order=location_start_date DESC`;

  const response = await fetch(`${API_URL}${query}`);
  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  const data: Business[] = await response.json();
  businessCache = { data, fetchedAt: Date.now() };
  return data;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZip, setSelectedZip] = useState('All');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchBusinesses(5000)
      .then(data => { setBusinesses(data); })
      .catch(err => { setLoadError('Failed to load business data. Please try refreshing.'); })
      .finally(() => { setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return businesses.filter(biz => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        biz.business_name?.toLowerCase().includes(search) ||
        biz.dba_name?.toLowerCase().includes(search) ||
        biz.primary_naics_description?.toLowerCase().includes(search);
      const matchesZip = selectedZip === 'All' || biz.zip_code.startsWith(selectedZip);
      return matchesSearch && matchesZip;
    });
  }, [businesses, searchTerm, selectedZip]);

  const stats = useMemo(() => {
    const industries: Record<string, number> = {};
    const zips: Record<string, number> = {};
    filtered.forEach(b => {
      const industry = b.primary_naics_description || 'Other';
      industries[industry] = (industries[industry] || 0) + 1;
      zips[b.zip_code] = (zips[b.zip_code] || 0) + 1;
    });
    return {
      total: filtered.length,
      industries: Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 5),
      zips: Object.entries(zips).sort((a, b) => b[1] - a[1])
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">Loading business directory...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <X className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-stone-800">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-80 border-r border-stone-200/50 bg-white/50 backdrop-blur-sm flex flex-col">
        <div className="p-4 border-b border-stone-200/50">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Filters</h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          {/* Zip Filter */}
          <select
            value={selectedZip}
            onChange={(e) => setSelectedZip(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          >
            <option value="All">All Zip Codes</option>
            {ZIP_CODES.map(zip => (
              <option key={zip} value={zip}>{zip}</option>
            ))}
          </select>
        </div>

        {/* Stats Summary */}
        <div className="p-4 border-b border-stone-200/50">
          <div className="glass rounded-xl p-3">
            <div className="text-2xl font-bold text-stone-900">{stats.total}</div>
            <div className="text-xs text-stone-500">Businesses Found</div>
          </div>
        </div>

        {/* Top Industries */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Top Industries</h3>
          <div className="space-y-2">
            {stats.industries.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="text-stone-600 truncate flex-1">{name.substring(0, 25)}{name.length > 25 ? '...' : ''}</span>
                <span className="text-stone-900 font-medium ml-2">{count}</span>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 mt-6">By Zip Code</h3>
          <div className="space-y-2">
            {stats.zips.map(([zip, count]) => (
              <div key={zip} className="flex items-center justify-between text-sm">
                <span className="text-stone-600">{zip}</span>
                <span className="text-stone-900 font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-stone-200/50 bg-white/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Business Directory</h1>
            <p className="text-xs text-stone-500">LA City Business Data • Hollywood Hills Area</p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-premium flex items-center gap-1.5 ${activeTab === 'map' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
                }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-premium flex items-center gap-1.5 ${activeTab === 'list' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
                }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          {activeTab === 'map' ? (
            <BusinessMap
              businesses={filtered}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={setSelectedBusiness}
            />
          ) : (
            <BusinessList
              businesses={filtered}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={setSelectedBusiness}
            />
          )}

          {/* Selected Business Card */}
          {selectedBusiness && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 glass rounded-xl p-4 shadow-premium">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-stone-900">{selectedBusiness.business_name}</h3>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="p-1 hover:bg-stone-100 rounded-full"
                >
                  <X className="w-4 h-4 text-stone-400" />
                </button>
              </div>
              {selectedBusiness.dba_name && (
                <p className="text-sm text-stone-500 mb-2">DBA: {selectedBusiness.dba_name}</p>
              )}
              <div className="space-y-1 text-sm">
                <p className="text-stone-600">{selectedBusiness.street_address}</p>
                <p className="text-stone-600">{selectedBusiness.city}, CA {selectedBusiness.zip_code}</p>
                <p className="text-stone-500 mt-2">{selectedBusiness.primary_naics_description || 'General Business'}</p>
                <p className="text-xs text-stone-400">NAICS: {selectedBusiness.naics}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Map Component
// Map Component
function BusinessMap({
  businesses,
  selectedBusiness,
  onSelectBusiness
}: {
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
}) {
  const mapContainerRef = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import Leaflet only on client side
    import('leaflet').then((L) => {
      // Initialize map only if it hasn't been created yet
      if (!mapInstanceRef.current) {
        const map = L.map('business-map', {
          preferCanvas: true // Use canvas for performance
        }).setView([34.1, -118.35], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          className: 'map-tiles'
        }).addTo(map);

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
        setMapLoaded(true);
      }
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when businesses or selection changes
  useEffect(() => {
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;

      const layerGroup = markersLayerRef.current;
      layerGroup.clearLayers();

      // Create selected marker icon (Keep as Pin for visibility)
      const createSelectedIcon = () => {
        return L.divIcon({
          className: 'custom-marker-selected',
          html: `<div class="w-10 h-10 bg-blue-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center ring-4 ring-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>
            </svg>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        });
      };

      businesses.forEach(biz => {
        if (biz.location?.latitude && biz.location?.longitude) {
          const lat = parseFloat(biz.location.latitude);
          const lng = parseFloat(biz.location.longitude);
          const isSelected = selectedBusiness?.location_account === biz.location_account;

          if (isSelected) {
            // Selected business gets a big Pin
            const marker = L.marker([lat, lng], {
              icon: createSelectedIcon(),
              zIndexOffset: 1000 // Ensure selected is on top
            }).addTo(layerGroup);

            // Auto pan to selected
            mapInstanceRef.current?.flyTo([lat, lng], 16);

            marker.bindPopup(`
              <div style="font-family: Inter, sans-serif; padding: 4px;">
                <strong style="font-size: 14px; color: #1c1917;">${biz.business_name}</strong><br/>
                <span style="font-size: 12px; color: #78716c;">${biz.street_address}</span>
              </div>
            `, { closeButton: false, offset: [0, -40] }).openPopup();

          } else {
            // Regular businesses get a small CircleMarker (Dot)
            const circle = L.circleMarker([lat, lng], {
              radius: 4, // Small radius
              fillColor: '#1c1917', // Stone-900
              color: '#ffffff',
              weight: 0.5,
              opacity: 0.8,
              fillOpacity: 0.7
            });

            circle.on('click', () => {
              onSelectBusiness(biz);
            });

            // Simple hover tooltip
            circle.bindTooltip(biz.business_name, {
              direction: 'top',
              offset: [0, -5],
              opacity: 0.9,
              className: 'text-xs font-medium'
            });

            circle.addTo(layerGroup);
          }
        }
      });
    });
  }, [businesses, selectedBusiness, onSelectBusiness, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      <div id="business-map" className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
          <div className="text-stone-500">Loading map...</div>
        </div>
      )}
    </div>
  );
}

// List Component
function BusinessList({
  businesses,
  selectedBusiness,
  onSelectBusiness
}: {
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4">
      <div className="space-y-3">
        {businesses.map(biz => (
          <div
            key={biz.location_account}
            onClick={() => onSelectBusiness(biz)}
            className={`glass rounded-xl p-4 shadow-premium hover:shadow-hover transition-premium cursor-pointer ${selectedBusiness?.location_account === biz.location_account ? 'ring-2 ring-stone-900' : ''
              }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-stone-900">{biz.business_name}</h3>
                {biz.dba_name && (
                  <p className="text-sm text-stone-500">{biz.dba_name}</p>
                )}
                <p className="text-sm text-stone-600 mt-1">{biz.street_address}</p>
                <p className="text-xs text-stone-400">{biz.zip_code}</p>
                <p className="text-xs text-stone-500 mt-1">{biz.primary_naics_description || 'General Business'}</p>
              </div>
              <Building2 className="w-5 h-5 text-stone-300" />
            </div>
          </div>
        ))}
      </div>

      {businesses.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No businesses found</p>
          <p className="text-sm text-stone-400">Try adjusting your search</p>
        </div>
      )}
    </div>
  );
}
