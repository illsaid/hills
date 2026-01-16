import { EventWithSource } from '@/lib/types/database';
import { Badge } from './ui/badge';
import { ExternalLink } from 'lucide-react';

interface EventCardProps {
  event: EventWithSource;
  variant?: 'dashboard' | 'terminal';
}

export function EventCard({ event, variant = 'dashboard' }: EventCardProps) {
  const isTerminal = variant === 'terminal';

  const levelColors = {
    INFO: isTerminal ? 'bg-blue-950 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800',
    ADVISORY: isTerminal ? 'bg-yellow-950 text-yellow-400 border-yellow-800' : 'bg-yellow-100 text-yellow-800',
    CRITICAL: isTerminal ? 'bg-red-950 text-red-400 border-red-800' : 'bg-red-100 text-red-800',
  };

  const verificationColors = {
    VERIFIED: isTerminal ? 'bg-green-950 text-green-400 border-green-800' : 'bg-green-100 text-green-800',
    SINGLE_SOURCE: isTerminal ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-800',
    UNVERIFIED: isTerminal ? 'bg-orange-950 text-orange-400 border-orange-800' : 'bg-orange-100 text-orange-800',
  };

  const impactColor = event.impact >= 4
    ? (isTerminal ? 'text-red-400' : 'text-red-600')
    : event.impact >= 3
    ? (isTerminal ? 'text-yellow-400' : 'text-yellow-600')
    : (isTerminal ? 'text-green-400' : 'text-green-600');

  const cardClass = isTerminal
    ? 'border border-green-900 bg-green-950/20 p-3 rounded'
    : 'border border-gray-200 bg-white p-4 rounded-lg shadow-sm';

  const titleClass = isTerminal
    ? 'font-semibold text-green-300 text-sm'
    : 'font-semibold text-gray-900';

  const textClass = isTerminal
    ? 'text-xs text-green-500'
    : 'text-sm text-gray-600';

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={titleClass}>{event.title}</h3>
        <div className="flex gap-1 flex-shrink-0">
          <Badge variant="outline" className={`text-xs ${levelColors[event.level]}`}>
            {event.level}
          </Badge>
        </div>
      </div>

      <p className={`${textClass} mb-3`}>{event.summary}</p>

      <div className={`flex flex-wrap gap-2 items-center ${textClass}`}>
        <Badge variant="outline" className={`text-xs ${verificationColors[event.verification]}`}>
          {event.verification}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {event.event_type}
        </Badge>
        <span className={`text-xs font-semibold ${impactColor}`}>
          Impact: {event.impact}/5
        </span>
      </div>

      <div className={`mt-3 pt-3 border-t ${isTerminal ? 'border-green-900' : 'border-gray-100'} space-y-1`}>
        <div className={`text-xs ${isTerminal ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="font-medium">Location:</span> {event.location_label}
        </div>
        <div className={`text-xs ${isTerminal ? 'text-green-600' : 'text-gray-500'}`}>
          <span className="font-medium">Observed:</span>{' '}
          {new Date(event.observed_at).toLocaleString()}
        </div>
        {event.source && (
          <div className={`text-xs ${isTerminal ? 'text-green-600' : 'text-gray-500'}`}>
            <span className="font-medium">Source:</span> {event.source.name}
          </div>
        )}
        {event.source_url && (
          <div>
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs inline-flex items-center gap-1 hover:underline ${
                isTerminal ? 'text-green-400' : 'text-blue-600'
              }`}
            >
              View Source <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
