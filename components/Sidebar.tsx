'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Landmark, Shield, TrafficCone, FileText, Building2, Chrome as Home, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Real Estate', href: '/real-estate', icon: Home },
  { name: 'Businesses', href: '/businesses', icon: Building2 },
  { name: 'Government Affairs', href: '/council', icon: Landmark },
  { name: 'Public Safety & Civic', href: '/safety', icon: Shield },
  { name: 'Street Work', href: '/infrastructure', icon: TrafficCone },
  { name: 'Permits', href: '/permits', icon: FileText },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="p-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </button>
          </Link>
        );
      })}
    </div>
  );
}

function ProPlanCTA() {
  return (
    <div className="mt-auto p-4 border-t border-stone-200/50">
      <div className="bg-gradient-to-br from-stone-900 to-stone-700 rounded-xl p-4 text-white">
        <p className="text-xs font-medium text-stone-300 mb-1">Pro Plan</p>
        <p className="text-sm font-medium mb-3">Full Access</p>
        <button className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors">
          Upgrade
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 h-full border-r border-stone-200/50 bg-white/50 backdrop-blur-sm flex-col flex-shrink-0">
        <NavLinks pathname={pathname} />
        <ProPlanCTA />
      </aside>

      {/* Mobile hamburger button — placed in top-nav row via fixed positioning */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/90 border border-stone-200/60 shadow-sm backdrop-blur-sm"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5 text-stone-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in panel */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-stone-200/50">
          <span className="font-semibold text-stone-900">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-xl hover:bg-stone-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </div>
        <ProPlanCTA />
      </div>
    </>
  );
}
