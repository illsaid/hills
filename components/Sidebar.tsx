'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertTriangle,
  Landmark,
  Shield,
  TrafficCone,
  Users,
  BarChart3,
  FileText,
  Building2,
  Home,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Top Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Real Estate', href: '/real-estate', icon: Home },
  { name: 'Businesses', href: '/businesses', icon: Building2 },
  { name: 'Government Affairs', href: '/council', icon: Landmark },
  { name: 'Public Safety & Civic', href: '/safety', icon: Shield },
  { name: 'Street Work', href: '/infrastructure', icon: TrafficCone },
  { name: 'Community Events', href: '/events', icon: Users },
  { name: 'Civic Insights', href: '/insights', icon: BarChart3 },
  { name: 'Permits', href: '/permits', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full border-r border-stone-200/50 bg-white/50 backdrop-blur-sm flex flex-col">
      {/* Navigation */}
      <div className="p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-premium ${isActive
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </button>
            </Link>
          );
        })}
      </div>

      {/* Premium CTA */}
      <div className="mt-auto p-4 border-t border-stone-200/50">
        <div className="bg-gradient-to-br from-stone-900 to-stone-700 rounded-xl p-4 text-white">
          <p className="text-xs font-medium text-stone-300 mb-1">Pro Plan</p>
          <p className="text-sm font-medium mb-3">Full Access</p>
          <button className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-premium">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}

