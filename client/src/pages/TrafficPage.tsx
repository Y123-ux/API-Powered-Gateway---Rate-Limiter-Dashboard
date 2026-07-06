import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, X } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { analyticsApi } from '../api/analyticsApi';
import type { TrafficLog } from '../types';

function StatusBadge({ status }: { status: number }) {
  if (status < 300) return <Badge variant="success">{status}</Badge>;
  if (status < 400) return <Badge variant="info">{status}</Badge>;
  if (status < 500) return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="error">{status}</Badge>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };
  return <span className={`font-mono text-xs font-bold ${colors[method] || 'text-dark-300'}`}>{method}</span>;
}

function RequestDetailModal({
  log,
  onClose,
}: {
  log: TrafficLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <MethodBadge method={log.method} />
            <span className="text-sm font-mono text-dark-200">{log.path}</span>
            <StatusBadge status={log.responseStatus} />
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark-400">Client:</span>{' '}
              <span className="text-dark-200">{log.clientId}</span>
            </div>
            <div>
              <span className="text-dark-400">Upstream:</span>{' '}
              <span className="text-dark-200">{log.upstreamTarget}</span>
            </div>
            <div>
              <span className="text-dark-400">Latency:</span>{' '}
              <span className="text-dark-200">{log.responseTimeMs}ms</span>
            </div>
            <div>
              <span className="text-dark-400">Time:</span>{' '}
              <span className="text-dark-200">
                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Request Headers</h4>
            <pre className="bg-dark-950 rounded-lg p-4 text-xs text-dark-300 overflow-x-auto">
              {JSON.stringify(log.requestHeaders, null, 2)}
            </pre>
          </div>

          {log.requestBody != null && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Request Body</h4>
              <pre className="bg-dark-950 rounded-lg p-4 text-xs text-dark-300 overflow-x-auto">
                {JSON.stringify(log.requestBody as object, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Response Headers</h4>
            <pre className="bg-dark-950 rounded-lg p-4 text-xs text-dark-300 overflow-x-auto">
              {JSON.stringify(log.responseHeaders, null, 2)}
            </pre>
          </div>

          {log.responseBody != null && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Response Body</h4>
              <pre className="bg-dark-950 rounded-lg p-4 text-xs text-dark-300 overflow-x-auto max-h-96">
                {typeof log.responseBody === 'string'
                  ? log.responseBody
                  : JSON.stringify(log.responseBody as object, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrafficPage() {
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState<TrafficLog | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['traffic', offset],
    queryFn: () => analyticsApi.getTrafficLogs({ limit, offset }),
    refetchInterval: 5000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div>
      <Header title="Traffic Logs" />

      <div className="p-6">
        <Card
          title={`Traffic Logs (${total} total)`}
          action={
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-3 py-1 text-xs bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-3 py-1 text-xs bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          }
        >
          {isLoading ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              No traffic logs yet. Send requests through the gateway.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-dark-400 border-b border-dark-700">
                    <th className="text-left px-6 py-3">Time</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-left px-4 py-3">Path</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Latency</th>
                    <th className="text-left px-4 py-3">Flags</th>
                    <th className="text-right px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-3 text-xs text-dark-400">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 text-xs text-dark-300">{log.clientId}</td>
                      <td className="px-4 py-3">
                        <MethodBadge method={log.method} />
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-200 font-mono max-w-[300px] truncate">
                        {log.path}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.responseStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-dark-400 text-right">
                        {log.responseTimeMs}ms
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {log.rateLimited && <Badge variant="warning">Throttled</Badge>}
                          {log.flagged && <Badge variant="error">Flagged</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-dark-400 hover:text-primary-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {selectedLog && (
        <RequestDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
