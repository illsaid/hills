export interface ParsedCommand {
  command: string;
  args: Record<string, string>;
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  const command = parts[0] || '';
  const args: Record<string, string> = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('--')) {
      const [key, ...valueParts] = part.substring(2).split('=');
      if (valueParts.length > 0) {
        args[key] = valueParts.join('=');
      } else if (i + 1 < parts.length && !parts[i + 1].startsWith('--')) {
        args[key] = parts[i + 1];
        i++;
      } else {
        args[key] = 'true';
      }
    } else if (!part.startsWith('--') && i === 1) {
      args['_positional'] = part;
    }
  }

  return { command, args, raw: trimmed };
}

export function getArg(
  args: Record<string, string>,
  key: string,
  defaultValue: string = ''
): string {
  return args[key] || defaultValue;
}

export function getArgNumber(
  args: Record<string, string>,
  key: string,
  defaultValue: number = 0
): number {
  const value = args[key];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}
