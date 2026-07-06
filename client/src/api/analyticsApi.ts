import httpClient from './httpClient';
import type { AnalyticsOverview, TrafficLog, TimeseriesPoint } from '../types';

export const analyticsApi = {
  getOverview: () =>
    httpClient.get<AnalyticsOverview>('/analytics/overview').then((r) => r.data),

  getTrafficLogs: (params?: {
    from?: number;
    to?: number;
    clientId?: string;
    limit?: number;
    offset?: number;
  }) =>
    httpClient
      .get<{ logs: TrafficLog[]; total: number }>('/analytics/traffic', { params })
      .then((r) => r.data),

  getTrafficLogById: (logId: string) =>
    httpClient.get<TrafficLog>(`/analytics/traffic/${logId}`).then((r) => r.data),

  getTimeseries: (params?: { from?: number; to?: number; interval?: string }) =>
    httpClient
      .get<TimeseriesPoint[]>('/analytics/timeseries', { params })
      .then((r) => r.data),

  getTopPaths: (limit = 10) =>
    httpClient
      .get<Array<{ path: string; count: number }>>('/analytics/top-paths', {
        params: { limit },
      })
      .then((r) => r.data),
};
