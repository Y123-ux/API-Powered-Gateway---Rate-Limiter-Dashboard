import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trash2, Copy, Server, Key } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { clientsApi } from '../api/clientsApi';

export default function SettingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: upstreams, isLoading: upstreamsLoading } = useQuery({
    queryKey: ['upstreams'],
    queryFn: clientsApi.getUpstreams,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getClients,
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setNewClientName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.deleteClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div>
      <Header title="Settings" />

      <div className="p-6 space-y-6">
        {/* Upstreams */}
        <Card title="Upstream Services">
          {upstreamsLoading ? (
            <Spinner />
          ) : (
            <div className="divide-y divide-dark-700">
              {upstreams?.map((upstream) => (
                <div
                  key={upstream.id}
                  className="px-6 py-4 flex items-center gap-4"
                >
                  <Server className="w-5 h-5 text-primary-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {upstream.name}
                      </span>
                      <Badge variant={upstream.enabled ? 'success' : 'neutral'}>
                        {upstream.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="text-xs text-dark-400 mt-1 font-mono">
                      {upstream.targetUrl}
                    </div>
                  </div>
                  <div className="text-xs text-dark-500 font-mono">
                    /gw/{upstream.id}/*
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* API Clients */}
        <Card
          title="API Clients"
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Client
            </button>
          }
        >
          {showForm && (
            <div className="p-6 border-b border-dark-700">
              <div className="flex gap-4">
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name..."
                  className="flex-1 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
                />
                <button
                  onClick={() => createMutation.mutate({ name: newClientName })}
                  disabled={!newClientName}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {clientsLoading ? (
            <Spinner />
          ) : !clients || clients.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              <Key className="w-12 h-12 mx-auto mb-3 text-dark-600" />
              <p>No API clients registered.</p>
              <p className="text-xs mt-1">Register a client to get an API key.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors"
                >
                  <Key className="w-5 h-5 text-yellow-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {client.name}
                      </span>
                      <Badge variant={client.enabled ? 'success' : 'neutral'}>
                        {client.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-dark-400 font-mono">
                        {client.apiKey.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyApiKey(client.apiKey)}
                        className="text-dark-500 hover:text-primary-400 transition-colors"
                        title="Copy API key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedKey === client.apiKey && (
                        <span className="text-xs text-green-400">Copied!</span>
                      )}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">
                      Created {format(new Date(client.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(client.id)}
                    className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
