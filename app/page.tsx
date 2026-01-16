import { supabaseServer } from '@/lib/supabase/server';
import { EventCard } from '@/components/EventCard';
import { ProjectCard } from '@/components/ProjectCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Terminal, Activity, AlertTriangle, Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const area = await supabaseServer
    .from('areas')
    .select('id, name, slug')
    .eq('slug', 'hollywood-hills')
    .single();

  if (!area.data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Area Not Found</h1>
          <p className="text-gray-600">Hollywood Hills area has not been configured yet.</p>
        </div>
      </div>
    );
  }

  const topEvents = await supabaseServer
    .from('events')
    .select('*, source:sources(*)')
    .eq('area_id', area.data.id)
    .eq('is_seed', false)
    .order('impact', { ascending: false })
    .order('observed_at', { ascending: false })
    .limit(10);

  const alertsCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const alertTypes = ['FIRE', 'FIRE_WEATHER', 'WEATHER', 'CLOSURE', 'PURSUIT'];

  const recentAlerts = await supabaseServer
    .from('events')
    .select('*, source:sources(*)')
    .eq('area_id', area.data.id)
    .eq('is_seed', false)
    .in('event_type', alertTypes)
    .gte('observed_at', alertsCutoff.toISOString())
    .order('observed_at', { ascending: false })
    .limit(10);

  const projectsCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentProjects = await supabaseServer
    .from('projects')
    .select('*')
    .eq('area_id', area.data.id)
    .gte('last_activity_at', projectsCutoff.toISOString())
    .order('last_activity_at', { ascending: false })
    .limit(10);

  const lastUpdate = await supabaseServer
    .from('events')
    .select('observed_at')
    .eq('is_seed', false)
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">THE HILLS LEDGER</h1>
              <p className="text-sm text-gray-600">{area.data.name} Decision Support Brief</p>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate.data && (
                <div className="text-xs text-gray-500">
                  Last update: {new Date(lastUpdate.data.observed_at).toLocaleString()}
                </div>
              )}
              <Link href="/terminal">
                <Button variant="outline" className="gap-2">
                  <Terminal className="w-4 h-4" />
                  Terminal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Top Events</h2>
            <Badge variant="outline" className="ml-auto">
              {topEvents.data?.length || 0} events
            </Badge>
          </div>

          {topEvents.data && topEvents.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {topEvents.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No events reported
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Recent Alerts</h2>
            <Badge variant="outline" className="ml-auto">
              Last 7 days
            </Badge>
          </div>

          {recentAlerts.data && recentAlerts.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {recentAlerts.data.map((alert) => (
                <EventCard key={alert.id} event={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent alerts
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-900">Projects to Watch</h2>
            <Badge variant="outline" className="ml-auto">
              Last 30 days
            </Badge>
          </div>

          {recentProjects.data && recentProjects.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentProjects.data.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent project activity
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-gray-500 text-center">
            Decision-support brief. For emergencies follow official channels. Data sources may vary in reliability and timeliness.
          </p>
        </div>
      </footer>
    </div>
  );
}
