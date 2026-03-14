'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WatchlistItem {
  id: string;
  term: string;
  type: 'address' | 'keyword' | 'permit' | 'business' | 'safety';
  label?: string;
  savedAt: string;
}

const STORAGE_KEY = 'hh_watchlist';

function loadFromStorage(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: WatchlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setLoaded(true);
  }, []);

  const add = useCallback((term: string, type: WatchlistItem['type'], label?: string) => {
    setItems(prev => {
      if (prev.some(i => i.term === term && i.type === type)) return prev;
      const next = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          term,
          type,
          label,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
      saveToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const isWatched = useCallback((term: string, type?: WatchlistItem['type']) => {
    return items.some(i => i.term === term && (!type || i.type === type));
  }, [items]);

  const toggle = useCallback((term: string, type: WatchlistItem['type'], label?: string) => {
    const existing = items.find(i => i.term === term && i.type === type);
    if (existing) {
      remove(existing.id);
    } else {
      add(term, type, label);
    }
  }, [items, add, remove]);

  return { items, add, remove, isWatched, toggle, loaded };
}
