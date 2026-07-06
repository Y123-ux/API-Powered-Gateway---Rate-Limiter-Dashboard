import httpClient from './httpClient';
import type { ApiDoc } from '../types';

export const docsApi = {
  generate: (upstreamId: string, sampleSize?: number) =>
    httpClient
      .post<ApiDoc>('/docs/generate', { upstreamId, sampleSize })
      .then((r) => r.data),

  getAll: () => httpClient.get<ApiDoc[]>('/docs').then((r) => r.data),

  getById: (docId: string) =>
    httpClient.get<ApiDoc>(`/docs/${docId}`).then((r) => r.data),

  delete: (docId: string) =>
    httpClient.delete(`/docs/${docId}`).then((r) => r.data),
};
