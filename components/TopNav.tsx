'use client';

import { Mountain, Search } from 'lucide-react';

export function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 glass-strong border-b border-stone-200/50 z-40 flex items-center justify-between px-4 lg:px-6">
      {/* Logo — offset on mobile to make room for hamburger button */}
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

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-stone-100 rounded-full transition-colors" aria-label="Search">
          <Search className="w-5 h-5 text-stone-600" />
        </button>
        <div className="w-8 h-8 bg-stone-200 rounded-full border-2 border-white shadow-sm" />
      </div>
    </nav>
  );
}
