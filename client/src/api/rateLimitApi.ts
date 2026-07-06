import httpClient from './httpClient';
import type { RateLimitRule } from '../types';

export const rateLimitApi = {
  getRules: () => httpClient.get<RateLimitRule[]>('/rate-limits').then((r) => r.data),

  createRule: (rule: Partial<RateLimitRule>) =>
    httpClient.post<RateLimitRule>('/rate-limits', rule).then((r) => r.data),

  updateRule: (ruleId: string, updates: Partial<RateLimitRule>) =>
    httpClient.put<RateLimitRule>(`/rate-limits/${ruleId}`, updates).then((r) => r.data),

  deleteRule: (ruleId: string) =>
    httpClient.delete(`/rate-limits/${ruleId}`).then((r) => r.data),

  getBucketStatus: (clientId: string) =>
    httpClient
      .get<{ tokens: number; maxTokens: number }>(`/rate-limits/status/${clientId}`)
      .then((r) => r.data),
};
