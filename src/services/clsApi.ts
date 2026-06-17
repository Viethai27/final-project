import { apiGet, apiSend } from './http';
import type { CLSOrderCreateInputDto, CLSOrderDetailDto, CLSOrderSummaryDto, CLSResultSummaryDto, ListQuery } from './backend-types';

export const clsApi = {
  createOrder: (body: CLSOrderCreateInputDto) =>
    apiSend<CLSOrderDetailDto>('/cls/orders', { method: 'POST', body }),
  listOrders: (query?: ListQuery) =>
    apiGet<CLSOrderSummaryDto[]>('/cls/orders', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getOrderById: (id: string) => apiGet<CLSOrderDetailDto>(`/cls/orders/${id}`),
  getOrdersByVisitId: (visitId: string) => apiGet<CLSOrderSummaryDto[]>(`/visits/${visitId}/cls-orders`),
  startOrder: (id: string, body?: { updatedById?: string | null; note?: string | null }) =>
    apiSend<CLSOrderDetailDto>(`/cls/orders/${id}/start`, { method: 'PATCH', body }),
  completeOrder: (
    id: string,
    body?: {
      updatedById?: string | null;
      note?: string | null;
      resultText?: string | null;
      resultFileUrl?: string | null;
      isAbnormal?: boolean | null;
      resultById?: string | null;
      resultDate?: string | null;
    },
  ) => apiSend<CLSOrderDetailDto>(`/cls/orders/${id}/complete`, { method: 'PATCH', body }),
  listResults: (query?: ListQuery) =>
    apiGet<CLSResultSummaryDto[]>('/cls/results', query as Record<string, string | number | boolean | undefined | null> | undefined),
  getResultById: (id: string) => apiGet<CLSResultSummaryDto>(`/cls/results/${id}`),
};
