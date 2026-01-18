import { EventWithSource } from '@/lib/types/database';
import { Badge } from './ui/badge';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface EventCardProps {
  event: EventWithSource;
  variant?: 'dashboard' | 'terminal';
}

export function EventCard({ event, variant = 'dashboard' }: EventCardProps) {
  const isTerminal = variant === 'terminal';

  // Terminal variant uses retro colors, Dashboard uses the new Titanium/Glass look
  const levelColors = {
    INFO: isTerminal
      ? 'bg-blue-950 text-blue-400 border-blue-800'
      : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/20',
    ADVISORY: isTerminal
      ? 'bg-yellow-950 text-yellow-400 border-yellow-800'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-200 dark:border-yellow-500/20',
    CRITICAL: isTerminal
      ? 'bg-red-950 text-red-400 border-red-800'
      : 'bg-red-100 text-red-800 border-red-200 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-100 dark:border-red-500/30 dark:ring-red-500/20',
  };

  const verificationColors = {
    VERIFIED: isTerminal
      ? 'bg-green-950 text-green-400 border-green-800'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    SINGLE_SOURCE: isTerminal
      ? 'bg-gray-800 text-gray-400 border-gray-700'
      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10',
    UNVERIFIED: isTerminal
      ? 'bg-orange-950 text-orange-400 border-orange-800'
      : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  };

  const impactColor = event.impact >= 4
    ? (isTerminal ? 'text-red-400' : 'text-red-600 dark:text-red-400')
    : event.impact >= 3
      ? (isTerminal ? 'text-yellow-400' : 'text-amber-600 dark:text-amber-400')
      : (isTerminal ? 'text-green-400' : 'text-emerald-600 dark:text-emerald-400');

  // Glassmorphism card for dashboard with Alert States
  const isCritical = !isTerminal && (event.level === 'CRITICAL' || event.title.includes('Red Flag'));
  const isAdvisory = !isTerminal && (event.level === 'ADVISORY' || event.title.includes('Wind Advisory'));

  const cardClass = isTerminal
    ? 'border border-green-900 bg-green-950/20 p-3 rounded font-mono'
    : isCritical
      ? 'group relative overflow-hidden rounded-2xl border border-red-500/50 bg-red-500/5 shadow-sm transition-all hover:bg-red-500/10 dark:border-red-500/50 dark:bg-red-900/20 dark:backdrop-blur-md p-6 md:p-7'
      : isAdvisory
        ? 'group relative overflow-hidden rounded-2xl border border-amber-400/50 bg-amber-400/5 shadow-sm transition-all hover:bg-amber-400/10 dark:border-amber-400/50 dark:bg-amber-900/20 dark:backdrop-blur-md p-6 md:p-7'
        : 'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm transition-all hover:bg-white/80 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-black/20 p-6 md:p-7';

  const titleClass = isTerminal
    ? 'font-semibold text-green-300 text-sm'
    : isCritical
      ? 'font-bold text-red-600 dark:text-red-400 text-lg tracking-tight'
      : isAdvisory
        ? 'font-bold text-amber-600 dark:text-amber-400 text-lg tracking-tight'
        : 'font-medium text-slate-900 dark:text-titanium-50 text-lg tracking-tight';

  const textClass = isTerminal
    ? 'text-xs text-green-500'
    : 'text-sm text-slate-600 dark:text-gray-400 leading-relaxed';

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className={titleClass}>{event.title}</h3>
        <div className="flex gap-2 flex-shrink-0">
          <Badge variant="outline" className={`backdrop-blur-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${levelColors[event.level]}`}>
            {event.level}
          </Badge>
        </div>
      </div>

      <p className={`${textClass} mb-4`}>{event.summary}</p>

      {/* Conditional Safety Link for Red Flag */}
      {!isTerminal && (event.title.includes('Red Flag') || event.title.includes('Fire')) && (
        <div className="mb-4">
          <a
            href="https://www.lafd.org/news/red-flag-parking-restrictions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200 text-sm font-medium hover:bg-red-200/50 dark:hover:bg-red-900/50 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Check LAFD Parking Restrictions
          </a>
        </div>
      )}

      <div className={`flex flex-wrap gap-2 items-center mb-4`}>
        <Badge variant="outline" className={`text-xs backdrop-blur-sm ${verificationColors[event.verification]}`}>
          {event.verification}
        </Badge>
        <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-400">
          {event.event_type}
        </Badge>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5 ${impactColor}`}>
          Impact {event.impact}/5
        </span>
      </div>

      <div className={`pt-3 border-t ${isTerminal ? 'border-green-900' : 'border-white/5'} space-y-1.5`}>
        <div className={`text-xs flex items-center justify-between ${isTerminal ? 'text-green-600' : 'text-gray-500'}`}>
          <span>{event.location_label}</span>
          <span>{new Date(event.observed_at).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })}</span>
        </div>

        {event.source_url && (
          <div className="flex justify-end pt-1">
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs inline-flex items-center gap-1.5 transition-colors ${isTerminal ? 'text-green-400 hover:text-green-300' : 'text-blue-400 hover:text-blue-300'
                }`}
            >
              {event.confidence_basis === 'Automated Logic Gate' ? 'System Logic' : 'Source'} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
