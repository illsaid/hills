import { ParsedCommand, getArg, getArgNumber } from './parse';

export interface CommandResult {
  type: 'success' | 'error' | 'help' | 'clear' | 'status';
  data?: any;
  message?: string;
}

export async function executeCommand(
  parsed: ParsedCommand
): Promise<CommandResult> {
  const { command, args } = parsed;

  switch (command) {
    case 'help':
      return {
        type: 'help',
        message: getHelpText(),
      };

    case 'clear':
      return { type: 'clear' };

    case 'status':
      return await executeStatus();

    case 'events':
      return await executeEvents(args);

    case 'alerts':
      return await executeAlerts(args);

    case 'projects':
      return await executeProjects(args);

    case 'project':
      return await executeProject(args);

    case 'ingest':
      return await executeIngest(args);

    default:
      return {
        type: 'error',
        message: `Unknown command: ${command}. Type 'help' for available commands.`,
      };
  }
}

async function executeStatus(): Promise<CommandResult> {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    if (!data.ok) {
      return { type: 'error', message: data.error || 'Status check failed' };
    }

    return { type: 'status', data };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

async function executeEvents(args: Record<string, string>): Promise<CommandResult> {
  try {
    const area = getArg(args, 'area', 'hollywood-hills');
    const days = getArgNumber(args, 'days', 7);
    const type = getArg(args, 'type');
    const limit = getArgNumber(args, 'limit', 10);

    const params = new URLSearchParams({
      area,
      days: days.toString(),
      limit: limit.toString(),
    });

    if (type) {
      params.set('type', type);
    }

    const response = await fetch(`/api/events?${params}`);
    const data = await response.json();

    if (data.error) {
      return { type: 'error', message: data.error };
    }

    return { type: 'success', data: { events: data.events, count: data.count } };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

async function executeAlerts(args: Record<string, string>): Promise<CommandResult> {
  try {
    const area = getArg(args, 'area', 'hollywood-hills');
    const days = getArgNumber(args, 'days', 7);
    const level = getArg(args, 'level');
    const limit = getArgNumber(args, 'limit', 10);

    const params = new URLSearchParams({
      area,
      days: days.toString(),
      limit: limit.toString(),
    });

    if (level) {
      params.set('level', level);
    }

    const response = await fetch(`/api/alerts?${params}`);
    const data = await response.json();

    if (data.error) {
      return { type: 'error', message: data.error };
    }

    return { type: 'success', data: { alerts: data.alerts, count: data.count } };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

async function executeProjects(args: Record<string, string>): Promise<CommandResult> {
  try {
    const area = getArg(args, 'area', 'hollywood-hills');
    const days = getArgNumber(args, 'days', 30);
    const limit = getArgNumber(args, 'limit', 10);

    const params = new URLSearchParams({
      area,
      days: days.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`/api/projects?${params}`);
    const data = await response.json();

    if (data.error) {
      return { type: 'error', message: data.error };
    }

    return { type: 'success', data: { projects: data.projects, count: data.count } };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

async function executeProject(args: Record<string, string>): Promise<CommandResult> {
  try {
    const projectId = args['_positional'];

    if (!projectId) {
      return { type: 'error', message: 'Usage: project <project_id>' };
    }

    const response = await fetch(`/api/project/${projectId}`);
    const data = await response.json();

    if (data.error) {
      return { type: 'error', message: data.error };
    }

    return { type: 'success', data: { project: data } };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

async function executeIngest(args: Record<string, string>): Promise<CommandResult> {
  try {
    const provider = getArg(args, 'provider');
    const area = getArg(args, 'area', 'hollywood-hills');

    if (!provider) {
      return {
        type: 'error',
        message: 'Usage: ingest --provider=<nws|ladbs> --area=<slug>',
      };
    }

    const ingestKey = prompt('Enter ingest key:');
    if (!ingestKey) {
      return { type: 'error', message: 'Ingest key required' };
    }

    const params = new URLSearchParams({ provider, area });

    const response = await fetch(`/api/ingest/run?${params}`, {
      method: 'POST',
      headers: {
        'x-ingest-key': ingestKey,
      },
    });

    const data = await response.json();

    if (!data.success) {
      return { type: 'error', message: data.error || 'Ingestion failed' };
    }

    return { type: 'success', data };
  } catch (error: any) {
    return { type: 'error', message: error.message };
  }
}

function getHelpText(): string {
  return `
Available Commands:

  help
    Display this help message

  status
    Show system status and last update information

  events --area=<slug> --days=<n> [--type=<TYPE>] [--limit=<n>]
    Query events (default: 7 days, limit 10)
    Types: FIRE, WEATHER, CLOSURE, PURSUIT, CRIME, PERMIT, OTHER

  alerts --area=<slug> --days=<n> [--level=<LEVEL>] [--limit=<n>]
    Query alerts (FIRE, WEATHER, CLOSURE, PURSUIT types only)
    Levels: INFO, ADVISORY, CRITICAL

  projects --area=<slug> --days=<n> [--limit=<n>]
    Query development projects (default: 30 days, limit 10)

  project <project_id>
    Get detailed information about a specific project

  ingest --provider=<nws|ladbs> --area=<slug>
    Manually trigger data ingestion (requires ingest key)

  clear
    Clear the terminal screen

Examples:
  events --days=14 --type=FIRE
  alerts --level=CRITICAL
  projects --days=60
  `.trim();
}

export const COMMAND_PRESETS = [
  { label: 'Recent Events', command: 'events --days=7' },
  { label: 'Critical Alerts', command: 'alerts --level=CRITICAL' },
  { label: 'Active Projects', command: 'projects --days=30' },
  { label: 'System Status', command: 'status' },
  { label: 'Fire Events', command: 'events --type=FIRE --days=14' },
];
