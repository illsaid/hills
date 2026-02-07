'use client';

import { useEffect, useState } from 'react';
import { FileText, ChevronRight, MapPin, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

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

export default function PermitsPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/permits')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPermits(data.permits);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        <h1 className="text-3xl font-light text-stone-900 mb-2">
          Building Permits
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl">
          ZIMA permits for Hollywood Hills (90068, 90046, 90069). Track new construction, renovations, and development activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-stone-900">{permits.length}</div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Total Permits</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-emerald-600">
            {permits.filter(p => p.status?.toLowerCase().includes('issued')).length}
          </div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Issued</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-amber-600">
            {permits.filter(p => p.status?.toLowerCase().includes('review')).length}
          </div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">In Review</div>
        </div>
        <div className="glass rounded-xl p-4 shadow-premium">
          <div className="text-2xl font-bold text-stone-900">
            ${(permits.reduce((sum, p) => sum + (parseFloat(p.valuation || '0')), 0) / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-stone-500 uppercase tracking-wide">Total Value</div>
        </div>
      </div>

      {/* Permits List */}
      <div>
        <div className="flex items-center justify-between py-3 mb-2">
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
            Recent Permits
          </h2>
          <span className="text-xs text-stone-500">Last 50 permits</span>
        </div>

        <div className="space-y-3">
          {permits.map((permit) => (
            <div 
              key={permit.permit_number}
              className="glass rounded-xl p-4 shadow-premium hover:shadow-hover transition-premium group cursor-pointer border-l-4 border-blue-400"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {permit.permit_type}
                    </span>
                    <span className="text-xs text-stone-400 tabular-nums">
                      {permit.permit_number}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      permit.status?.toLowerCase().includes('issued') 
                        ? 'bg-emerald-100 text-emerald-700'
                        : permit.status?.toLowerCase().includes('review')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}>
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
          ))}
        </div>

        {permits.length === 0 && (
          <div className="glass rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No permits found in the database.</p>
            <p className="text-sm text-stone-400 mt-1">
              Run the permit scraper to populate data.
            </p>
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="flex justify-end pt-8 border-t border-stone-200">
        <Link
          href="/"
          className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
