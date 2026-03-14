'use client';

import { useState, useEffect } from 'react';
import { Mountain, Search, Bookmark } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { WatchlistPanel } from './WatchlistPanel';
import { useWatchlist } from '@/hooks/useWatchlist';

function TopNavInner() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const { items } = useWatchlist();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 glass-strong border-b border-stone-200/50 z-40 flex items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <Mountain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-stone-900">
            Hollywood Hills
          </span>
          <span className="hidden sm:block text-stone-400 font-light">|</span>
          <span className="hidden sm:block text-sm text-stone-500 font-medium">Civic Dashboard</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-full text-sm text-stone-500 transition-colors group"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline text-xs">Search</span>
            <kbd className="hidden md:inline text-xs text-stone-400 border border-stone-300 rounded px-1 ml-1">⌘K</kbd>
          </button>

          {/* Watchlist trigger */}
          <button
            onClick={() => setWatchlistOpen(true)}
            className="relative p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500"
            aria-label="Watchlist"
          >
            <Bookmark className="w-4 h-4" />
            {items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </button>

          <div className="w-8 h-8 bg-stone-200 rounded-full border-2 border-white shadow-sm ml-1" />
        </div>
      </nav>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <WatchlistPanel isOpen={watchlistOpen} onClose={() => setWatchlistOpen(false)} />
    </>
  );
}

export function TopNav() {
  return <TopNavInner />;
}
