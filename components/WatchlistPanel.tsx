'use client';

import { useState, useRef, useEffect } from 'react';
import { Bookmark, X, MapPin, FileText, Building2, Shield, Tag, Plus, ExternalLink, Clock } from 'lucide-react';
import { useWatchlist, WatchlistItem } from '@/hooks/useWatchlist';
import Link from 'next/link';

const TYPE_META: Record<WatchlistItem['type'], { icon: typeof MapPin; label: string; color: string; href: (term: string) => string }> = {
  address: {
    icon: MapPin,
    label: 'Address',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    href: (term) => `/real-estate?address=${encodeURIComponent(term)}`,
  },
  permit: {
    icon: FileText,
    label: 'Permit',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    href: (term) => `/permits?q=${encodeURIComponent(term)}`,
  },
  business: {
    icon: Building2,
    label: 'Business',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    href: (term) => `/businesses?q=${encodeURIComponent(term)}`,
  },
  safety: {
    icon: Shield,
    label: 'Safety',
    color: 'text-red-600 bg-red-50 border-red-200',
    href: (term) => `/safety?q=${encodeURIComponent(term)}`,
  },
  keyword: {
    icon: Tag,
    label: 'Keyword',
    color: 'text-stone-600 bg-stone-50 border-stone-200',
    href: (term) => `/?q=${encodeURIComponent(term)}`,
  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

interface WatchlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WatchlistPanel({ isOpen, onClose }: WatchlistPanelProps) {
  const { items, remove, add, loaded } = useWatchlist();
  const [newTerm, setNewTerm] = useState('');
  const [newType, setNewType] = useState<WatchlistItem['type']>('keyword');
  const [addMode, setAddMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addMode && inputRef.current) inputRef.current.focus();
  }, [addMode]);

  useEffect(() => {
    if (!isOpen) {
      setAddMode(false);
      setNewTerm('');
    }
  }, [isOpen]);

  const handleAdd = () => {
    const trimmed = newTerm.trim();
    if (!trimmed) return;
    add(trimmed, newType, trimmed);
    setNewTerm('');
    setAddMode(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-stone-700" />
            <h2 className="font-semibold text-stone-900">Watchlist</h2>
            {items.length > 0 && (
              <span className="text-xs bg-stone-100 text-stone-500 rounded-full px-2 py-0.5 font-medium">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-b border-stone-100">
          {addMode ? (
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="text"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddMode(false); }}
                placeholder="Enter address, permit #, keyword..."
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as WatchlistItem['type'])}
                  className="flex-1 px-2 py-1.5 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none"
                >
                  {(Object.keys(TYPE_META) as WatchlistItem['type'][]).map(t => (
                    <option key={t} value={t}>{TYPE_META[t].label}</option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!newTerm.trim()}
                  className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => { setAddMode(false); setNewTerm(''); }}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddMode(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg border border-dashed border-stone-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add to watchlist
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex items-center justify-center py-12 text-stone-400 text-sm">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Bookmark className="w-6 h-6 text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-700 mb-1">No saved items</p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Save addresses, permit numbers, business names, or keywords to track activity across the dashboard.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {items.map(item => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 group hover:bg-stone-50 transition-colors">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center mt-0.5 ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{item.label || item.term}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-stone-400">{meta.label}</span>
                        <span className="text-stone-200">•</span>
                        <span className="text-xs text-stone-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(item.savedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={meta.href(item.term)} onClick={onClose}>
                        <button className="p-1.5 rounded hover:bg-stone-200 transition-colors" title="View">
                          <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                        </button>
                      </Link>
                      <button
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5 text-stone-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-stone-100">
            <p className="text-xs text-center text-stone-400">
              Saved locally in your browser
            </p>
          </div>
        )}
      </div>
    </>
  );
}
