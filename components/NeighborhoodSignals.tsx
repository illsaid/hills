'use client';

import { useState, useEffect } from 'react';
import { Phone, Trash2, Construction, Tent, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Issue311 {
  name: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
}

interface ActiveCluster {
  location: string;
  issueType: string;
  reports: number;
  status: 'active' | 'monitoring' | 'resolved';
}

export function NeighborhoodSignals() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue311[]>([]);
  const [clusters, setClusters] = useState<ActiveCluster[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/neighborhood-signals');
        const json = await res.json();
        if (json.success) {
          setIssues(json.issues || getDefaultIssues());
          setClusters(json.clusters || getDefaultClusters());
        } else {
          setIssues(getDefaultIssues());
          setClusters(getDefaultClusters());
        }
      } catch (e) {
        setIssues(getDefaultIssues());
        setClusters(getDefaultClusters());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function getDefaultIssues(): Issue311[] {
    return [
      { name: 'Illegal Dumping', count: 23, trend: 'up', icon: Trash2 },
      { name: 'Street Pavement Issues', count: 18, trend: 'stable', icon: Construction },
      { name: 'Homeless Encampments', count: 12, trend: 'down', icon: Tent },
    ];
  }

  function getDefaultClusters(): ActiveCluster[] {
    return [
      { location: 'Beachwood Canyon', issueType: 'Dumping', reports: 8, status: 'active' },
      { location: 'Outpost Dr', issueType: 'Pavement', reports: 5, status: 'monitoring' },
    ];
  }

  function getTrendBadge(trend: 'up' | 'down' | 'stable') {
    const styles = {
      up: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
      down: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
      stable: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-titanium-400',
    };
    const labels = { up: 'Rising', down: 'Declining', stable: 'Stable' };
    return (
      <Badge variant="outline" className={`text-[10px] ${styles[trend]}`}>
        {labels[trend]}
      </Badge>
    );
  }

  function getStatusBadge(status: 'active' | 'monitoring' | 'resolved') {
    const styles = {
      active: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
      monitoring: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400',
      resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
    };
    return (
      <Badge variant="outline" className={`text-[10px] capitalize ${styles[status]}`}>
        {status}
      </Badge>
    );
  }

  function getIconColor(icon: React.ElementType) {
    if (icon === Trash2) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
    if (icon === Construction) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20';
    if (icon === Tent) return 'text-slate-600 dark:text-titanium-400 bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10';
    return 'text-slate-600 dark:text-titanium-400 bg-slate-50 dark:bg-white/10 border-slate-200 dark:border-white/10';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 dark:backdrop-blur-md p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg border border-cyan-100 dark:border-cyan-500/20">
          <Phone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900 dark:text-titanium-50">311 Tracker</h3>
          <p className="text-xs text-slate-500 dark:text-titanium-400">Neighborhood service requests</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="mb-5">
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-titanium-500 mb-3">Top Issues (30 days)</h4>
            <div className="space-y-2">
              {issues.map((issue) => {
                const Icon = issue.icon;
                const colorClass = getIconColor(Icon);
                return (
                  <div
                    key={issue.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg border ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-titanium-100">{issue.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">{issue.count}</span>
                      {getTrendBadge(issue.trend)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-titanium-500 mb-3 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Active Clusters
            </h4>
            <div className="space-y-2">
              {clusters.map((cluster, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-titanium-500" />
                      <span className="text-sm font-medium text-slate-800 dark:text-titanium-100">{cluster.location}</span>
                    </div>
                    {getStatusBadge(cluster.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-titanium-400">
                    <span>{cluster.issueType}</span>
                    <span>{cluster.reports} reports</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="hidden dark:block absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />
    </div>
  );
}
