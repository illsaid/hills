'use client';

import { Bookmark } from 'lucide-react';
import { useWatchlist, WatchlistItem } from '@/hooks/useWatchlist';

interface WatchmarkButtonProps {
  term: string;
  type: WatchlistItem['type'];
  label?: string;
  className?: string;
}

export function WatchmarkButton({ term, type, label, className = '' }: WatchmarkButtonProps) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(term, type);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(term, type, label); }}
      title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`p-1.5 rounded-lg transition-all ${watched
        ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
        : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100'
      } ${className}`}
    >
      <Bookmark className={`w-3.5 h-3.5 ${watched ? 'fill-amber-500' : ''}`} />
    </button>
  );
}
