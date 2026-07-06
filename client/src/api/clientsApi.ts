import httpClient from './httpClient';
import type { ApiClient, UpstreamConfig, FlaggedRequest } from '../types';

export const clientsApi = {
  getClients: () => httpClient.get<ApiClient[]>('/clients').then((r) => r.data),

  createClient: (data: { name: string; rateLimitRuleId?: string }) =>
    httpClient.post<ApiClient>('/clients', data).then((r) => r.data),

  updateClient: (clientId: string, updates: Partial<ApiClient>) =>
    httpClient.put<ApiClient>(`/clients/${clientId}`, updates).then((r) => r.data),

  deleteClient: (clientId: string) =>
    httpClient.delete(`/clients/${clientId}`).then((r) => r.data),

  getUpstreams: () =>
    httpClient.get<UpstreamConfig[]>('/upstreams').then((r) => r.data),

  getFlagged: (params?: { limit?: number; offset?: number }) =>
    httpClient
      .get<{ items: FlaggedRequest[]; total: number }>('/flagged', { params })
      .then((r) => r.data),

  dismissFlag: (logId: string) =>
    httpClient.put(`/flagged/${logId}/dismiss`).then((r) => r.data),
};
