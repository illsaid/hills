import { Project } from '@/lib/types/database';
import { Badge } from './ui/badge';

interface ProjectCardProps {
  project: Project;
  variant?: 'dashboard' | 'terminal';
  showDossier?: boolean;
}

export function ProjectCard({
  project,
  variant = 'dashboard',
  showDossier = false,
}: ProjectCardProps) {
  const isTerminal = variant === 'terminal';

  const statusColors: Record<string, string> = {
    'Under Review': isTerminal
      ? 'bg-blue-950 text-blue-400 border-blue-800'
      : 'bg-blue-100 text-blue-800',
    'Approved': isTerminal
      ? 'bg-green-950 text-green-400 border-green-800'
      : 'bg-green-100 text-green-800',
    'Pending': isTerminal
      ? 'bg-yellow-950 text-yellow-400 border-yellow-800'
      : 'bg-yellow-100 text-yellow-800',
  };

  const cardClass = isTerminal
    ? 'border border-green-900 bg-green-950/20 p-3 rounded'
    : 'border border-gray-200 bg-white p-4 rounded-lg shadow-sm';

  const titleClass = isTerminal
    ? 'font-semibold text-green-300 text-sm'
    : 'font-semibold text-gray-900';

  const textClass = isTerminal ? 'text-xs text-green-500' : 'text-sm text-gray-600';

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={titleClass}>{project.title}</h3>
        <Badge
          variant="outline"
          className={`text-xs flex-shrink-0 ${
            statusColors[project.status] || (isTerminal ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-800')
          }`}
        >
          {project.status}
        </Badge>
      </div>

      <div className={`${textClass} space-y-2`}>
        <div>
          <span className="font-medium">Location:</span> {project.location_label}
        </div>
        <div>
          <span className="font-medium">Last Activity:</span>{' '}
          {new Date(project.last_activity_at).toLocaleDateString()}
        </div>
      </div>

      {showDossier && (
        <div
          className={`mt-3 pt-3 border-t ${
            isTerminal ? 'border-green-900' : 'border-gray-100'
          }`}
        >
          <div className={`${textClass} whitespace-pre-wrap`}>
            {project.dossier}
          </div>
        </div>
      )}
    </div>
  );
}
