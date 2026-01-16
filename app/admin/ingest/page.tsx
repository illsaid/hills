'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Home, RefreshCw, Bug } from 'lucide-react';

interface IngestRun {
  id: string;
  provider: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  items_fetched: number;
  items_inserted: number;
  error: string | null;
  source?: {
    name: string;
    provider_key: string;
  };
}

interface DebugResult {
  ok: boolean;
  provider: string;
  source_url: string;
  fetched_count: number;
  parsed_sample: any[];
  raw_sample: any[];
  error?: string;
}

export default function AdminIngestPage() {
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    try {
      const response = await fetch('/api/ingest/runs?area=hollywood-hills&limit=20');
      const data = await response.json();
      setRuns(data.runs || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const runIngest = async (provider: string) => {
    setLoading({ ...loading, [provider]: true });
    setError(null);
    try {
      const response = await fetch(`/api/ingest/run?provider=${provider}&area=hollywood-hills`, {
        method: 'POST',
        headers: {
          'x-ingest-key': 'hills-ledger-ingest-key-2024',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ingestion failed');
      }
      await loadRuns();
    } catch (err: any) {
      setError(`${provider}: ${err.message}`);
    } finally {
      setLoading({ ...loading, [provider]: false });
    }
  };

  const debugProvider = async (provider: string) => {
    setLoading({ ...loading, [`debug-${provider}`]: true });
    setError(null);
    setDebugResult(null);
    try {
      const response = await fetch(`/api/ingest/debug?provider=${provider}&area=hollywood-hills`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Debug failed');
      }
      setDebugResult(data);
    } catch (err: any) {
      setError(`Debug ${provider}: ${err.message}`);
    } finally {
      setLoading({ ...loading, [`debug-${provider}`]: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ingestion Admin</h1>
            <p className="text-sm text-gray-600">Debug and run data ingestion</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Run Ingestion</CardTitle>
            <CardDescription>Manually trigger data ingestion from each provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['lafd', 'nws', 'ladbs'].map((provider) => (
                <div key={provider} className="flex flex-col gap-2 p-4 border rounded-lg">
                  <h3 className="font-semibold uppercase text-sm">{provider}</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => runIngest(provider)}
                      disabled={loading[provider]}
                      className="flex-1"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading[provider] ? 'animate-spin' : ''}`} />
                      Run
                    </Button>
                    <Button
                      onClick={() => debugProvider(provider)}
                      disabled={loading[`debug-${provider}`]}
                      variant="outline"
                    >
                      <Bug className={`w-4 h-4 ${loading[`debug-${provider}`] ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {debugResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Debug Result: {debugResult.provider.toUpperCase()}</CardTitle>
              <CardDescription>Parse test without inserting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={debugResult.ok ? 'default' : 'destructive'} className="ml-2">
                      {debugResult.ok ? 'Success' : 'Error'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Fetched Count:</span>
                    <span className="ml-2 font-semibold">{debugResult.fetched_count}</span>
                  </div>
                </div>
                {debugResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                    {debugResult.error}
                  </div>
                )}
                {debugResult.parsed_sample.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Parsed Sample ({debugResult.parsed_sample.length}):</h4>
                    <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(debugResult.parsed_sample, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Runs</span>
              <Button onClick={loadRuns} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>Last 20 ingestion runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No runs yet</p>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            run.status === 'SUCCESS'
                              ? 'default'
                              : run.status === 'ERROR'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {run.status}
                        </Badge>
                        <span className="font-semibold uppercase text-sm">{run.provider}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(run.started_at).toLocaleString()}
                        </span>
                      </div>
                      {run.error && (
                        <div className="text-xs text-red-600 mt-1">{run.error}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Fetched: <span className="font-semibold">{run.items_fetched}</span> / Inserted:{' '}
                      <span className="font-semibold">{run.items_inserted}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
