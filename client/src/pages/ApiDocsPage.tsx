import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, Sparkles, Trash2, Download, Eye } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { docsApi } from '../api/docsApi';
import { clientsApi } from '../api/clientsApi';
import { useSocket } from '../hooks/useSocket';
import type { GenerationProgress, ApiDoc } from '../types';

function DocViewer({ spec }: { spec: object }) {
  return (
    <div className="bg-dark-950 rounded-lg p-6 overflow-auto max-h-[600px]">
      <pre className="text-xs text-dark-300 font-mono">
        {JSON.stringify(spec, null, 2)}
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  const [selectedUpstream, setSelectedUpstream] = useState('');
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ApiDoc | null>(null);
  const queryClient = useQueryClient();

  const { data: upstreams } = useQuery({
    queryKey: ['upstreams'],
    queryFn: clientsApi.getUpstreams,
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: docsApi.getAll,
  });

  const generateMutation = useMutation({
    mutationFn: (upstreamId: string) => docsApi.generate(upstreamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] });
      setProgress(null);
    },
    onError: () => {
      setProgress(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: docsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['docs'] }),
  });

  const progressHandler = useCallback((data: GenerationProgress) => {
    setProgress(data);
    if (data.stage === 'complete') {
      setTimeout(() => setProgress(null), 2000);
    }
  }, []);

  useSocket<GenerationProgress>('docs:generation-progress', progressHandler);

  const handleGenerate = () => {
    if (!selectedUpstream) return;
    setProgress({ stage: 'collecting', percent: 0, message: 'Starting...' });
    generateMutation.mutate(selectedUpstream);
  };

  const handleDownload = (doc: ApiDoc) => {
    const blob = new Blob([JSON.stringify(doc.openApiSpec, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openapi-${doc.upstreamTarget}-${doc.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header title="API Documentation" />

      <div className="p-6 space-y-6">
        {/* Generate */}
        <Card title="Generate OpenAPI Docs">
          <div className="p-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs text-dark-400 mb-1">Select Upstream</label>
                <select
                  value={selectedUpstream}
                  onChange={(e) => setSelectedUpstream(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
                >
                  <option value="">Choose an upstream service...</option>
                  {upstreams?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.targetUrl})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!selectedUpstream || generateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </button>
            </div>

            {/* Progress Bar */}
            {progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-dark-300">{progress.message}</span>
                  <span className="text-sm text-primary-400">{progress.percent}%</span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {generateMutation.isError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {(generateMutation.error as Error).message}
              </div>
            )}
          </div>
        </Card>

        {/* Docs List */}
        <Card title="Generated Documentation">
          {isLoading ? (
            <Spinner />
          ) : !docs || docs.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-dark-600" />
              <p>No documentation generated yet.</p>
              <p className="text-xs mt-1">
                Send traffic through the gateway, then generate docs above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {doc.upstreamTarget}
                      </span>
                      <Badge variant="info">{doc.version}</Badge>
                    </div>
                    <div className="text-xs text-dark-400 mt-1">
                      {doc.trafficSampleCount} samples analyzed &middot;{' '}
                      {format(new Date(doc.generatedAt), 'MMM dd, yyyy HH:mm')} &middot;{' '}
                      {doc.promptTokensUsed + doc.completionTokensUsed} tokens used
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingDoc(viewingDoc?.id === doc.id ? null : doc)}
                      className="p-2 text-dark-400 hover:text-primary-400 transition-colors"
                      title="View spec"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-dark-400 hover:text-green-400 transition-colors"
                      title="Download JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Doc Viewer */}
        {viewingDoc && (
          <Card title={`OpenAPI Spec - ${viewingDoc.upstreamTarget} ${viewingDoc.version}`}>
            <div className="p-6">
              <DocViewer spec={viewingDoc.openApiSpec} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
