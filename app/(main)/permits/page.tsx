'use client';

import { useEffect, useState, useMemo } from 'react';
import { FileText, ChevronRight, MapPin, Calendar, DollarSign, Search, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { WatchmarkButton } from '@/components/WatchmarkButton';

interface Permit {
  permit_number: string;
  address: string;
  zip_code: string;
  permit_type: string;
  description: string;
  issue_date: string;
  status: string;
  valuation: string | null;
  zimas_url: string;
}

const ZIP_CODES = ['All', '90046', '90068', '90069'];
const STATUS_OPTIONS = ['All', 'Issued', 'In Review', 'Expired', 'Pending'];

const BORDER_COLORS: Record<string, string> = {
  'Issued': 'border-l-emerald-500',
  'In Review': 'border-l-amber-500',
  'Expired': 'border-l-stone-300',
  'Pending': 'border-l-blue-400',
};

function getStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('issued')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('review')) return 'bg-amber-100 text-amber-700';
  if (s.includes('expired')) return 'bg-stone-100 text-stone-600';
  return 'bg-blue-100 text-blue-700';
}

function getBorderColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s.includes('issued')) return 'border-l-emerald-500';
  if (s.includes('review')) return 'border-l-amber-500';
  if (s.includes('expired')) return 'border-l-stone-300';
  return 'border-l-blue-400';
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZip, setSelectedZip] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch('/api/permits')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPermits(data.permits);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const permitTypes = useMemo(() => {
    const types = new Set(permits.map(p => p.permit_type).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [permits]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return permits.filter(p => {
      const matchesSearch = !q ||
        p.address?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.permit_number?.toLowerCase().includes(q) ||
        p.permit_type?.toLowerCase().includes(q);
      const matchesZip = selectedZip === 'All' || p.zip_code === selectedZip;
      const matchesStatus = selectedStatus === 'All' || p.status?.toLowerCase().includes(selectedStatus.toLowerCase());
      const matchesType = selectedType === 'All' || p.permit_type === selectedType;
      return matchesSearch && matchesZip && matchesStatus && matchesType;
    });
  }, [permits, searchTerm, selectedZip, selectedStatus, selectedType]);

  const stats = useMemo(() => ({
    total: filtered.length,
    issued: filtered.filter(p => p.status?.toLowerCase().includes('issued')).length,
    inReview: filtered.filter(p => p.status?.toLowerCase().includes('review')).length,
    totalValue: filtered.reduce((sum, p) => sum + (parseFloat(p.valuation || '0')), 0),
  }), [filtered]);

  const hasActiveFilters = selectedZip !== 'All' || selectedStatus !== 'All' || selectedType !== 'All' || searchTerm;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedZip('All');
    setSelectedStatus('All');
    setSelectedType('All');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">Loading permits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-stone-900 mb-2">Building Permits</h1>
        <p className="text-lg text-stone-500 max-w-2xl">
          ZIMA permits for Hollywood Hills (90068, 90046, 90069). Track new construction, renovations, and development activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-stone-900">{stats.total}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Matching</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-emerald-600">{stats.issued}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Issued</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-amber-600">{stats.inReview}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">In Review</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-stone-900">
            ${(stats.totalValue / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Total Value</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by address, description, permit number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-stone-400 hover:text-stone-600" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasActiveFilters ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-white border border-stone-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-1.5">Zip Code</label>
              <div className="flex gap-1.5">
                {ZIP_CODES.map(zip => (
                  <button
                    key={zip}
                    onClick={() => setSelectedZip(zip)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedZip === zip ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {zip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-1.5">Status</label>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedStatus === s ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-1.5">Permit Type</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-3 py-1.5 bg-stone-100 border-0 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              >
                {permitTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Showing <span className="font-medium text-stone-900">{filtered.length}</span> of {permits.length} permits
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Permits List */}
      <div className="space-y-3">
        {filtered.map((permit) => (
          <div
            key={permit.permit_number}
            className={`glass rounded-xl p-4 shadow-premium hover:shadow-hover transition-premium group cursor-pointer border-l-4 ${getBorderColor(permit.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {permit.permit_type}
                  </span>
                  <span className="text-xs text-stone-400 tabular-nums">
                    {permit.permit_number}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(permit.status)}`}>
                    {permit.status}
                  </span>
                </div>

                <h3 className="font-semibold text-stone-900 mb-1">{permit.address}</h3>
                <p className="text-sm text-stone-600 mb-3">{permit.description}</p>

                <div className="flex items-center gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(permit.issue_date).toLocaleDateString()}
                  </span>
                  {permit.valuation && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${parseFloat(permit.valuation).toLocaleString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {permit.zip_code}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                <WatchmarkButton
                  term={permit.address}
                  type="permit"
                  label={`${permit.permit_type} — ${permit.address}`}
                />
                <a
                  href={permit.zimas_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  ZIMA
                  <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">{permits.length === 0 ? 'No permits found in the database.' : 'No permits match your filters.'}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div className="flex justify-end pt-8 border-t border-stone-200">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
