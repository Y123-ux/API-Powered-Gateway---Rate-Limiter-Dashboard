import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import Header from '../components/layout/Header';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import { rateLimitApi } from '../api/rateLimitApi';
import { useThrottleEvents } from '../hooks/useRateLimitStatus';
import { format } from 'date-fns';
import type { RateLimitRule } from '../types';

function RuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<RateLimitRule>;
  onSave: (data: Partial<RateLimitRule>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    clientId: initial?.clientId || '*',
    path: initial?.path || '',
    maxTokens: initial?.maxTokens || 100,
    refillRate: initial?.refillRate || 10,
    refillIntervalMs: initial?.refillIntervalMs || 1000,
    burstAllowance: initial?.burstAllowance || 20,
  });

  return (
    <div className="p-6 bg-dark-800 rounded-lg border border-dark-600 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-dark-400 mb-1">Client ID (* for all)</label>
          <input
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">Path (optional)</label>
          <input
            value={form.path}
            onChange={(e) => setForm({ ...form, path: e.target.value })}
            placeholder="/api/..."
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">Max Tokens (bucket size)</label>
          <input
            type="number"
            value={form.maxTokens}
            onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">Refill Rate (tokens/interval)</label>
          <input
            type="number"
            value={form.refillRate}
            onChange={(e) => setForm({ ...form, refillRate: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">Refill Interval (ms)</label>
          <input
            type="number"
            value={form.refillIntervalMs}
            onChange={(e) => setForm({ ...form, refillIntervalMs: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-1">Burst Allowance</label>
          <input
            type="number"
            value={form.burstAllowance}
            onChange={(e) => setForm({ ...form, burstAllowance: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-dark-300 bg-dark-700 rounded-lg hover:bg-dark-600"
        >
          <X className="w-4 h-4 inline mr-1" />
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          <Save className="w-4 h-4 inline mr-1" />
          Save Rule
        </button>
      </div>
    </div>
  );
}

export default function RateLimitsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RateLimitRule | null>(null);
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rate-limits'],
    queryFn: rateLimitApi.getRules,
  });

  const createMutation = useMutation({
    mutationFn: rateLimitApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RateLimitRule> }) =>
      rateLimitApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
      setEditingRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: rateLimitApi.deleteRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rate-limits'] }),
  });

  const throttleEvents = useThrottleEvents(5);

  return (
    <div>
      <Header title="Rate Limits" />

      <div className="p-6 space-y-6">
        {/* Throttle Alerts */}
        {throttleEvents.length > 0 && (
          <Card title="Recent Throttle Events">
            <div className="divide-y divide-dark-700">
              {throttleEvents.map((event, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-4">
                  <Badge variant="warning">429</Badge>
                  <span className="text-sm text-dark-300">{event.clientId}</span>
                  <span className="text-sm text-dark-400 font-mono">{event.path}</span>
                  <span className="text-xs text-dark-500 ml-auto">
                    Retry after {event.retryAfterMs}ms
                  </span>
                  <span className="text-xs text-dark-500">
                    {format(new Date(event.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Rules */}
        <Card
          title="Rate Limit Rules"
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          }
        >
          {showForm && (
            <div className="p-6 border-b border-dark-700">
              <RuleForm
                onSave={(data) => createMutation.mutate(data)}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {isLoading ? (
            <Spinner />
          ) : !rules || rules.length === 0 ? (
            <div className="p-8 text-center text-dark-500">
              No rate limit rules configured. Using default settings.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-dark-400 border-b border-dark-700">
                    <th className="text-left px-6 py-3">Client</th>
                    <th className="text-left px-4 py-3">Path</th>
                    <th className="text-right px-4 py-3">Max Tokens</th>
                    <th className="text-right px-4 py-3">Refill</th>
                    <th className="text-right px-4 py-3">Burst</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-dark-800/50">
                      {editingRule?.id === rule.id ? (
                        <td colSpan={7} className="p-4">
                          <RuleForm
                            initial={editingRule}
                            onSave={(data) =>
                              updateMutation.mutate({ id: rule.id, data })
                            }
                            onCancel={() => setEditingRule(null)}
                          />
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-3 text-sm text-dark-200">
                            {rule.clientId === '*' ? 'All Clients' : rule.clientId}
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-300 font-mono">
                            {rule.path || '*'}
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-300 text-right">
                            {rule.maxTokens}
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-300 text-right">
                            {rule.refillRate}/{rule.refillIntervalMs}ms
                          </td>
                          <td className="px-4 py-3 text-sm text-dark-300 text-right">
                            {rule.burstAllowance}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingRule(rule)}
                                className="text-dark-400 hover:text-primary-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteMutation.mutate(rule.id)}
                                className="text-dark-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
