import { apiGet } from './http';
import type { ApiPagination, ListQuery, QueueItemSummaryDto } from './backend-types';

export interface QueueListResponse {
  items: QueueItemSummaryDto[];
  pagination: ApiPagination;
}

export const queueApi = {
  list: async (query?: ListQuery) => {
    const response = await apiGet<QueueItemSummaryDto[]>('/queue', query as Record<string, string | number | boolean | undefined | null> | undefined);
    return response;
  },
  getById: (id: string) => apiGet<QueueItemSummaryDto>(`/queue/${id}`),
};
