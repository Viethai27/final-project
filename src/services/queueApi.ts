import { apiGet, apiSend } from './http';
import type { ApiPagination, ListQuery, QueueItemSummaryDto } from './backend-types';

export interface QueueListResponse {
  items: QueueItemSummaryDto[];
  pagination: ApiPagination;
}

export type QueueLaneFilter = 'ALL' | 'PRIORITY' | 'APPOINTMENT' | 'AFTER_CLS' | 'NORMAL';
export type QueueAction = 'call' | 'start' | 'timeout' | 'cancel';

export interface QueueListQuery extends ListQuery {
  lane?: QueueLaneFilter;
}

type QueueActionBody = {
  updatedById?: string | null;
  note?: string | null;
};

export const queueApi = {
  list: async (query?: QueueListQuery) => {
    const response = await apiGet<QueueItemSummaryDto[]>('/queue', query as Record<string, string | number | boolean | undefined | null> | undefined);
    return response;
  },
  getById: (id: string) => apiGet<QueueItemSummaryDto>(`/queue/${id}`),
  call: (id: string, body?: QueueActionBody) =>
    apiSend<QueueItemSummaryDto>(`/queue/${id}/call`, { method: 'PATCH', body }),
  start: (id: string, body?: QueueActionBody) =>
    apiSend<QueueItemSummaryDto>(`/queue/${id}/start`, { method: 'PATCH', body }),
  timeout: (id: string, body?: QueueActionBody) =>
    apiSend<QueueItemSummaryDto>(`/queue/${id}/timeout`, { method: 'PATCH', body }),
  cancel: (id: string, body?: QueueActionBody) =>
    apiSend<QueueItemSummaryDto>(`/queue/${id}/cancel`, { method: 'PATCH', body }),
};
