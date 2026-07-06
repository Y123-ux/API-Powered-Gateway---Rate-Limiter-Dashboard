import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ShieldAlert, Check } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { clientsApi } from '../api/clientsApi';

export default function FlaggedPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['flagged'],
    queryFn: () => clientsApi.getFlagged(),
    refetchInterval: 5000,
  });

  const dismissMutation = useMutation({
    mutationFn: clientsApi.dismissFlag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flagged'] }),
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const severityVariant = (s: string) => {
    if (s === 'high') return 'error';
    if (s === 'medium') return 'warning';
    return 'info';
  };

  return (
    <div>
      <Header title="Flagged Requests" />

      <div className="p-6">
        <Card title={`Flagged Requests (${total})`}>
          {isLoading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-dark-600" />
              <p>No flagged requests. All clear!</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`px-6 py-4 flex items-center gap-4 transition-colors ${
                    item.dismissed ? 'opacity-50' : 'hover:bg-dark-800/50'
                  }`}
                >
                  <ShieldAlert
                    className={`w-5 h-5 flex-shrink-0 ${
                      item.severity === 'high'
                        ? 'text-red-400'
                        : item.severity === 'medium'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant(item.severity)}>
                        {item.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-dark-200">{item.reason}</span>
                    </div>
                    <div className="text-xs text-dark-400 mt-1">
                      Log: {item.logId} &middot;{' '}
                      {format(new Date(item.timestamp), 'MMM dd, HH:mm:ss')}
                    </div>
                  </div>
                  {!item.dismissed && (
                    <button
                      onClick={() => dismissMutation.mutate(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  )}
                  {item.dismissed && (
                    <Badge variant="neutral">Dismissed</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
