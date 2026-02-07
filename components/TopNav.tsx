'use client';

import { useState } from 'react';
import { Mountain, Search, Bell } from 'lucide-react';
import Link from 'next/link';

const VIEW_OPTIONS = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'activity', label: 'Activity' },
  { id: 'development', label: 'Development' },
];

export function TopNav() {
  const [activeView, setActiveView] = useState('alerts');
  const [hasNotifications, setHasNotifications] = useState(true);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 glass-strong border-b border-stone-200/50 z-50 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
          <Mountain className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-stone-900">
          Hollywood Hills
        </span>
        <span className="text-stone-400 font-light">|</span>
        <span className="text-sm text-stone-500 font-medium">Civic Dashboard</span>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-stone-100/80 rounded-full p-1 border border-stone-200/50">
        {VIEW_OPTIONS.map((view) => (
          <Link
            key={view.id}
            href={view.id === 'alerts' ? '/' : `/${view.id}`}
            onClick={() => setActiveView(view.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-premium ${
              activeView === view.id
                ? 'bg-white shadow-sm text-stone-900'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {view.label}
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-stone-100 rounded-full transition-premium">
          <Search className="w-5 h-5 text-stone-600" />
        </button>
        <button className="p-2 hover:bg-stone-100 rounded-full transition-premium relative">
          <Bell className="w-5 h-5 text-stone-600" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full status-pulse" />
          )}
        </button>
        <div className="w-8 h-8 bg-stone-200 rounded-full border-2 border-white shadow-sm" />
      </div>
    </nav>
  );
}
