'use client';

import { useState, useRef, useEffect } from 'react';
import { parseCommand } from '@/lib/terminal/parse';
import { executeCommand, CommandResult, COMMAND_PRESETS } from '@/lib/terminal/commands';
import { EventCard } from './EventCard';
import { ProjectCard } from './ProjectCard';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface OutputEntry {
  id: string;
  command: string;
  result: CommandResult;
}

export function Terminal() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;

    const command = input.trim();
    setInput('');
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setIsExecuting(true);

    const parsed = parseCommand(command);
    const result = await executeCommand(parsed);

    if (result.type === 'clear') {
      setOutput([]);
    } else {
      setOutput((prev) => [
        ...prev,
        { id: crypto.randomUUID(), command, result },
      ]);
    }

    setIsExecuting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const executePreset = (command: string) => {
    setInput(command);
    setTimeout(() => {
      inputRef.current?.focus();
      const form = inputRef.current?.form;
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-green-400 font-mono">
      <div className="border-b border-green-900 p-4">
        <h1 className="text-lg font-bold">THE HILLS LEDGER :: TERMINAL</h1>
        <p className="text-xs text-green-600">Type &apos;help&apos; for available commands</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4" ref={outputRef}>
        {output.map((entry) => (
          <div key={entry.id} className="space-y-2">
            <div className="text-green-500">
              <span className="text-green-700">$ </span>
              {entry.command}
            </div>
            <OutputRenderer result={entry.result} />
          </div>
        ))}
      </div>

      <div className="border-t border-green-900 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {COMMAND_PRESETS.map((preset) => (
            <Button
              key={preset.command}
              variant="outline"
              size="sm"
              onClick={() => executePreset(preset.command)}
              className="bg-green-950 border-green-800 text-green-400 hover:bg-green-900 text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <span className="text-green-700 self-center">$</span>
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            className="flex-1 bg-black border-green-900 text-green-400 focus:border-green-700 font-mono"
            placeholder="Enter command..."
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}

function OutputRenderer({ result }: { result: CommandResult }) {
  if (result.type === 'error') {
    return (
      <div className="text-red-400 pl-4">
        ERROR: {result.message}
      </div>
    );
  }

  if (result.type === 'help') {
    return (
      <pre className="text-green-400 pl-4 whitespace-pre-wrap text-sm">
        {result.message}
      </pre>
    );
  }

  if (result.type === 'status') {
    return (
      <div className="pl-4 space-y-1 text-sm">
        <div>Status: <span className="text-green-300">OPERATIONAL</span></div>
        <div>Area: <span className="text-green-300">{result.data.area?.name}</span></div>
        <div>Active Sources: <span className="text-green-300">{result.data.sources_active}</span></div>
        {result.data.last_ingest && (
          <div>
            Last Ingest: <span className="text-green-300">{result.data.last_ingest.provider}</span> - {result.data.last_ingest.status}
          </div>
        )}
        {result.data.last_update && (
          <div>Last Update: <span className="text-green-300">{new Date(result.data.last_update).toLocaleString()}</span></div>
        )}
      </div>
    );
  }

  if (result.type === 'success') {
    const { data } = result;

    if (data.events) {
      return (
        <div className="pl-4 space-y-3">
          <div className="text-green-500 text-sm">
            Found {data.count} event(s)
          </div>
          {data.events.map((event: any) => (
            <EventCard key={event.id} event={event} variant="terminal" />
          ))}
        </div>
      );
    }

    if (data.alerts) {
      return (
        <div className="pl-4 space-y-3">
          <div className="text-green-500 text-sm">
            Found {data.count} alert(s)
          </div>
          {data.alerts.map((alert: any) => (
            <EventCard key={alert.id} event={alert} variant="terminal" />
          ))}
        </div>
      );
    }

    if (data.projects) {
      return (
        <div className="pl-4 space-y-3">
          <div className="text-green-500 text-sm">
            Found {data.count} project(s)
          </div>
          {data.projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} variant="terminal" showDossier={false} />
          ))}
        </div>
      );
    }

    if (data.project) {
      return (
        <div className="pl-4 space-y-3">
          <ProjectCard project={data.project} variant="terminal" showDossier={true} />
        </div>
      );
    }

    if (data.success !== undefined) {
      return (
        <div className="pl-4 space-y-1 text-sm">
          <div>Ingestion completed</div>
          <div>Provider: <span className="text-green-300">{data.provider}</span></div>
          <div>Fetched: <span className="text-green-300">{data.fetched}</span></div>
          <div>Inserted: <span className="text-green-300">{data.inserted}</span></div>
        </div>
      );
    }

    return (
      <pre className="pl-4 text-sm text-green-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return null;
}
